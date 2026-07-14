// Admin CRUD server functions for the Selah Studio internal app.
//
// Every function in this module is gated by `requireAdmin`, which chains on
// top of `requireSupabaseAuth` and additionally checks `is_admin(auth.uid())`
// against the `admin_users` table. Callers must be signed in AND registered
// as admins; anonymous callers and signed-in non-admins are rejected before
// any supabaseAdmin (service_role) work runs.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";


const optionSchema = z.union([
  z.string(),
  z.object({
    text: z.string(),
    resultType: z.string().optional().nullable(),
    score: z.number().optional().nullable(),
  }),
]);

const questionSchema = z.object({
  id: z.string(),
  type: z.string(),
  text: z.string(),
  required: z.boolean().optional(),
  options: z.array(optionSchema).optional().nullable(),
});

const responseSchema = z.object({
  id: z.string(),
  surveyId: z.string(),
  submittedAt: z.number(),
  answers: z.record(z.any()),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  inLounge: z.boolean().optional(),
  resultTypeId: z.string().optional().nullable(),
});

const surveySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  completion_message: z.string(),
  audience_type: z.enum(["general", "christian"]),
  category: z.string(),
  estimated_time: z.string(),
  bible_verse: z.string().optional().nullable(),
  questions: z.array(questionSchema),
  resultTypes: z.array(z.any()).optional().nullable(),
  status: z.enum(["draft", "published", "closed"]),
  createdAt: z.number(),
  deletedAt: z.number().optional().nullable(),
  responses: z.array(responseSchema).optional().default([]),
  design_settings: z.any().optional().nullable(),
  share_card: z.any().optional().nullable(),
  sourceJson: z.string().optional().nullable(),
});

const customerSchema = z.object({
  id: z.string(),
  name: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  inLounge: z.boolean().optional(),
  payment_status: z.enum(["unpaid", "paid"]).optional(),
  payment_provider: z.string().optional().nullable(),
  payment_id: z.string().optional().nullable(),
  paid_at: z.number().nullable().optional(),
});

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------

export const fetchAllData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [surveysRes, questionsRes, responsesRes, customersRes] = await Promise.all([
    supabaseAdmin.from("surveys").select("*"),
    supabaseAdmin.from("survey_questions").select("*").order("position", { ascending: true }),
    supabaseAdmin.from("survey_responses").select("*"),
    supabaseAdmin.from("customers").select("*"),
  ]);
  if (surveysRes.error) throw surveysRes.error;
  if (questionsRes.error) throw questionsRes.error;
  if (responsesRes.error) throw responsesRes.error;
  if (customersRes.error) throw customersRes.error;
  return {
    surveys: surveysRes.data ?? [],
    questions: questionsRes.data ?? [],
    responses: responsesRes.data ?? [],
    customers: customersRes.data ?? [],
  };
});

// -----------------------------------------------------------------------------
// Surveys
// -----------------------------------------------------------------------------

export const upsertSurveyAndQuestions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => surveySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const surveyRow = {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      completion_message: data.completion_message,
      audience_type: data.audience_type,
      category: data.category,
      estimated_time: data.estimated_time,
      bible_verse: data.bible_verse ?? null,
      result_types: data.resultTypes ?? [],
      design_settings: data.design_settings ?? {},
      share_card: data.share_card ?? {},
      status: data.status,
      source_json: data.sourceJson ?? null,
      deleted_at: data.deletedAt ? new Date(data.deletedAt).toISOString() : null,
    };
    const { error: e1 } = await supabaseAdmin.from("surveys").upsert(surveyRow);
    if (e1) throw e1;

    await supabaseAdmin.from("survey_questions").delete().eq("survey_id", data.id);
    if (data.questions.length) {
      const qRows = data.questions.map((q, i) => ({
        id: q.id,
        survey_id: data.id,
        position: i,
        type: q.type,
        text: q.text,
        required: q.required ?? true,
        options: q.options ?? null,
      }));
      const { error: eIns } = await supabaseAdmin.from("survey_questions").insert(qRows);
      if (eIns) throw eIns;
    }
    return { ok: true };
  });

export const softDeleteSurveyServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("surveys")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const hardDeleteSurveyServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("surveys").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// -----------------------------------------------------------------------------
// Responses
// -----------------------------------------------------------------------------

export const insertResponseServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => responseSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      id: data.id,
      survey_id: data.surveyId,
      customer_id: data.customerId ?? null,
      customer_name: data.customerName ?? null,
      customer_email: data.customerEmail ?? null,
      answers: data.answers,
      result_type_id: data.resultTypeId ?? null,
      in_lounge: data.inLounge ?? false,
      submitted_at: new Date(data.submittedAt).toISOString(),
    };
    const { error } = await supabaseAdmin.from("survey_responses").upsert(row);
    if (error) throw error;
    return { ok: true };
  });

export const updateResponseContactServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        surveyId: z.string(),
        responseId: z.string(),
        customerId: z.string(),
        customerName: z.string(),
        customerEmail: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("survey_responses")
      .update({
        customer_id: data.customerId,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
      })
      .eq("id", data.responseId)
      .eq("survey_id", data.surveyId);
    if (error) throw error;
    return { ok: true };
  });

export const setResponseInLoungeServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        surveyId: z.string(),
        responseId: z.string(),
        value: z.boolean(),
        customerId: z.string().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("survey_responses")
      .update({ in_lounge: data.value })
      .eq("id", data.responseId)
      .eq("survey_id", data.surveyId);
    if (error) throw error;
    if (data.customerId) {
      const { data: rows } = await supabaseAdmin
        .from("survey_responses")
        .select("id")
        .eq("customer_id", data.customerId)
        .eq("in_lounge", true)
        .limit(1);
      const hasAny = (rows?.length ?? 0) > 0;
      await supabaseAdmin.from("customers").update({ in_lounge: hasAny }).eq("id", data.customerId);
    }
    return { ok: true };
  });

// -----------------------------------------------------------------------------
// Customers (admin-side)
// -----------------------------------------------------------------------------

export const updateCustomerServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string(),
        patch: z.record(z.any()),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const p = data.patch;
    const update: {
      name?: string | null;
      nickname?: string | null;
      email?: string | null;
      in_lounge?: boolean;
      payment_status?: "unpaid" | "paid";
      payment_provider?: string | null;
      payment_id?: string | null;
      paid_at?: string | null;
    } = {};
    if (p.name !== undefined) update.name = p.name as string | null;
    if (p.nickname !== undefined) update.nickname = p.nickname as string | null;
    if (p.email !== undefined) update.email = p.email as string | null;
    if (p.inLounge !== undefined) update.in_lounge = p.inLounge as boolean;
    if (p.payment_status !== undefined)
      update.payment_status = p.payment_status as "unpaid" | "paid";
    if (p.payment_provider !== undefined)
      update.payment_provider = p.payment_provider as string | null;
    if (p.payment_id !== undefined) update.payment_id = p.payment_id as string | null;
    if (p.paid_at !== undefined)
      update.paid_at = p.paid_at ? new Date(p.paid_at as number).toISOString() : null;
    if (!Object.keys(update).length) return { ok: true };
    const { error } = await supabaseAdmin.from("customers").update(update).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });


export const upsertCustomerFromResponseServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emailNorm = data.email.trim().toLowerCase();
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("email", emailNorm)
      .maybeSingle();
    if (existing) {
      await supabaseAdmin.from("customers").update({ name: data.name }).eq("id", existing.id);
      return { id: existing.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("customers")
      .insert({ id: data.id, name: data.name, email: emailNorm })
      .select("id")
      .single();
    if (error) throw error;
    return { id: inserted.id };
  });

// -----------------------------------------------------------------------------
// localStorage migration (idempotent)
// -----------------------------------------------------------------------------

export const migrateLocalData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        surveys: z.array(surveySchema),
        customers: z.array(customerSchema),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let surveyCount = 0;
    let questionCount = 0;
    let responseCount = 0;
    let customerCount = 0;
    const errors: string[] = [];

    for (const c of data.customers) {
      const row = {
        id: c.id,
        name: c.name ?? null,
        nickname: c.nickname ?? null,
        email: c.email ? c.email.toLowerCase() : null,
        in_lounge: c.inLounge ?? false,
        payment_status: c.payment_status ?? "unpaid",
        payment_provider: c.payment_provider ?? null,
        payment_id: c.payment_id ?? null,
        paid_at: c.paid_at ? new Date(c.paid_at).toISOString() : null,
      };
      const { error } = await supabaseAdmin.from("customers").upsert(row, { onConflict: "id" });
      if (error) errors.push(`customer ${c.id}: ${error.message}`);
      else customerCount++;
    }

    for (const s of data.surveys) {
      const surveyRow = {
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        completion_message: s.completion_message,
        audience_type: s.audience_type,
        category: s.category,
        estimated_time: s.estimated_time,
        bible_verse: s.bible_verse ?? null,
        result_types: s.resultTypes ?? [],
        design_settings: s.design_settings ?? {},
        share_card: s.share_card ?? {},
        status: s.status,
        source_json: s.sourceJson ?? null,
        deleted_at: s.deletedAt ? new Date(s.deletedAt).toISOString() : null,
      };
      const { error: e1 } = await supabaseAdmin.from("surveys").upsert(surveyRow, { onConflict: "id" });
      if (e1) {
        errors.push(`survey ${s.id}: ${e1.message}`);
        continue;
      }
      surveyCount++;

      await supabaseAdmin.from("survey_questions").delete().eq("survey_id", s.id);
      if (s.questions.length) {
        const qRows = s.questions.map((q, i) => ({
          id: q.id,
          survey_id: s.id,
          position: i,
          type: q.type,
          text: q.text,
          required: q.required ?? true,
          options: q.options ?? null,
        }));
        const { error: eq } = await supabaseAdmin.from("survey_questions").insert(qRows);
        if (eq) errors.push(`questions ${s.id}: ${eq.message}`);
        else questionCount += qRows.length;
      }

      for (const r of s.responses ?? []) {
        const rRow = {
          id: r.id,
          survey_id: s.id,
          customer_id: r.customerId ?? null,
          customer_name: r.customerName ?? null,
          customer_email: r.customerEmail ?? null,
          answers: r.answers,
          result_type_id: r.resultTypeId ?? null,
          in_lounge: r.inLounge ?? false,
          submitted_at: new Date(r.submittedAt).toISOString(),
        };
        const { error: er } = await supabaseAdmin
          .from("survey_responses")
          .upsert(rRow, { onConflict: "id" });
        if (er) errors.push(`response ${r.id}: ${er.message}`);
        else responseCount++;
      }
    }

    return { surveyCount, questionCount, responseCount, customerCount, errors };
  });

// Seed a survey if it does not already exist. Used by /s/:slug to publish the
// built-in Selah money-diagnosis fallback survey to the database once, so
// anonymous respondents can submit responses that satisfy the survey_id FK.
export const ensureFallbackSurvey = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => surveySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("surveys")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (existing) return { id: existing.id, created: false };

    const surveyRow = {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      completion_message: data.completion_message,
      audience_type: data.audience_type,
      category: data.category,
      estimated_time: data.estimated_time,
      bible_verse: data.bible_verse ?? null,
      result_types: data.resultTypes ?? [],
      design_settings: data.design_settings ?? {},
      share_card: data.share_card ?? {},
      status: "published" as const,
      source_json: data.sourceJson ?? null,
    };
    const { error: e1 } = await supabaseAdmin.from("surveys").insert(surveyRow);
    if (e1) throw e1;
    if (data.questions.length) {
      const qRows = data.questions.map((q, i) => ({
        id: q.id,
        survey_id: data.id,
        position: i,
        type: q.type,
        text: q.text,
        required: q.required ?? true,
        options: q.options ?? null,
      }));
      const { error: eq } = await supabaseAdmin.from("survey_questions").insert(qRows);
      if (eq) throw eq;
    }
    return { id: data.id, created: true };
  });
