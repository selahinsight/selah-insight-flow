// Email server functions.
//
// - `sendFreeResultEmail` is a PUBLIC server function callable from the
//   anonymous public diagnosis page. It authorizes the caller by matching
//   `customerId` + `contactToken` against `customers`. Never trust anything
//   else the client sends.
// - `listEmailLogsServer` / `resendFreeResultEmailServer` require admin.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { allSelahMoneyResults, customerFaithResultTitle } from "@/lib/selah-money-results";

// ---------- Public: free result email ----------

const sendInput = z.object({
  customerId: z.string().min(1),
  contactToken: z.string().min(1),
  surveyId: z.string().min(1),
  responseId: z.string().min(1),
  resultTypeId: z.string().optional().nullable(),
  secondaryResultTypeId: z.string().optional().nullable(),
  faithLensId: z.string().optional().nullable(),
});

type ResultType = {
  id: string;
  title?: string;
  description?: string;
  interpretation?: string;
  reflection?: string;
  practice?: string;
  suggested_practice?: string;
  scripture?: string;
  small_action?: string;
  email_result?: string;
};

function pickResultType(all: unknown, id?: string | null): ResultType | undefined {
  if (!id || !Array.isArray(all)) return undefined;
  return (all as ResultType[]).find((r) => r?.id === id);
}

function stripTags(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

function buildEmailHtml(args: {
  displayName: string;
  surveyTitle: string;
  primary?: ResultType;
  secondary?: ResultType;
  faithLens?: ResultType;
}): { subject: string; html: string; text: string } {
  const { displayName, surveyTitle, primary, secondary, faithLens } = args;
  const primaryTitle = primary?.title ?? "결과 유형";
  const primaryDesc = primary?.email_result ?? primary?.description ?? primary?.interpretation ?? "";
  const practice = primary?.small_action ?? primary?.practice ?? primary?.suggested_practice ?? "";
  const secondaryLine = secondary?.title
    ? `함께 나타나는 유형: ${secondary.title}`
    : "";
  const faithTitle = faithLens
    ? customerFaithResultTitle(faithLens.id, faithLens.title ?? "신앙 유형")
    : "";
  const faithLine = faithLens?.title
    ? `신앙 유형: ${faithTitle}`
    : "";
  const faithDesc = faithLens?.email_result ?? faithLens?.description ?? "";

  const subject = `${displayName}님의 ${surveyTitle} 결과 안내`;

  const text = [
    `${displayName}님, 안녕하세요.`,
    ``,
    `${surveyTitle} 결과를 보내드립니다.`,
    ``,
    `주된 돈 반응 유형: ${primaryTitle}`,
    primaryDesc && `해석: ${primaryDesc}`,
    secondaryLine,
    faithLine,
    faithDesc && `설명: ${faithDesc}`,
    practice && ``,
    practice && `이번 주 작은 실천: ${practice}`,
    ``,
    `언제든 다시 진단 페이지에 방문해 결과를 확인하실 수 있어요.`,
    `유료 상세 리포트는 준비 중입니다. 준비되는 대로 다시 안내드릴게요.`,
    ``,
    `이 메일은 진단 결과 저장 시점에 안내를 위해 발송되었습니다.`,
    `이 결과는 참고용이며 의료적 진단이나 치료를 대신하지 않습니다.`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#f7f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#3a2f27;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
  <p style="font-size:12px;letter-spacing:0.18em;color:#a1856b;margin:0 0 8px;">SELAH · FREE RESULT</p>
  <h1 style="font-size:22px;line-height:1.4;margin:0 0 20px;color:#2b2320;">${stripTags(displayName)}님, 결과를 보내드려요</h1>
  <p style="font-size:14px;line-height:1.7;margin:0 0 20px;color:#4a3f37;">${stripTags(surveyTitle)}에 응답해 주셔서 감사합니다. 아래는 회신용 요약 결과입니다.</p>

  <div style="border:1px solid #ece3d6;border-radius:14px;padding:20px;margin:0 0 18px;">
    <p style="font-size:11px;letter-spacing:0.18em;color:#a1856b;margin:0 0 6px;">주된 돈 반응 유형</p>
    <h2 style="font-size:18px;margin:0 0 10px;color:#2b2320;">${stripTags(primaryTitle)}</h2>
    ${primaryDesc ? `<p style="font-size:13.5px;line-height:1.75;margin:0 0 8px;color:#4a3f37;">${stripTags(primaryDesc)}</p>` : ""}
    ${secondaryLine ? `<p style="font-size:12.5px;color:#6b5c50;margin:8px 0 0;">${stripTags(secondaryLine)}</p>` : ""}
  </div>

  ${faithLine ? `<div style="border:1px solid #ece3d6;border-radius:14px;padding:20px;margin:0 0 18px;">
    <p style="font-size:11px;letter-spacing:0.18em;color:#a1856b;margin:0 0 6px;">신앙 렌즈</p>
    <h3 style="font-size:16px;margin:0 0 8px;color:#2b2320;">${stripTags(faithTitle)}</h3>
    ${faithDesc ? `<p style="font-size:13.5px;line-height:1.75;margin:0;color:#4a3f37;">${stripTags(faithDesc)}</p>` : ""}
  </div>` : ""}

  ${practice ? `<div style="background:#f7f2ea;border-radius:14px;padding:18px 20px;margin:0 0 18px;">
    <p style="font-size:11px;letter-spacing:0.18em;color:#a1856b;margin:0 0 6px;">이번 주 작은 실천</p>
    <p style="font-size:14px;line-height:1.7;margin:0;color:#3a2f27;">${stripTags(practice)}</p>
  </div>` : ""}

  <p style="font-size:13px;line-height:1.7;margin:20px 0 6px;color:#4a3f37;">언제든 다시 진단 페이지에 방문하시면 이 결과를 다시 확인하실 수 있어요.</p>
  <p style="font-size:12.5px;line-height:1.7;margin:0 0 24px;color:#6b5c50;">유료 상세 리포트는 준비 중입니다. 준비되는 대로 안내드릴게요.</p>

  <hr style="border:none;border-top:1px solid #ece3d6;margin:24px 0;" />
  <p style="font-size:11px;line-height:1.6;color:#8a7a6c;margin:0;">이 메일은 진단 결과 저장 시점에 안내를 위해 발송되었습니다. 이 결과는 참고용이며, 의료적 진단이나 치료를 대신하지 않습니다.</p>
</div></body></html>`;

  return { subject, html, text };
}

async function sendViaResend(args: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 500)}` };
    }
    let messageId = "";
    try {
      messageId = (JSON.parse(body)?.id as string) ?? "";
    } catch {
      /* ignore */
    }
    return { ok: true, messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function sendFreeResultEmailImpl(input: z.infer<typeof sendInput>): Promise<{
  status: "sent" | "failed" | "not_configured";
  error?: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Authorize via contact_token
  const { data: customer, error: cErr } = await supabaseAdmin
    .from("customers")
    .select("id, name, nickname, email, contact_token")
    .eq("id", input.customerId)
    .maybeSingle();
  if (cErr || !customer) {
    return { status: "failed", error: "customer not found" };
  }
  if ((customer.contact_token ?? "") !== input.contactToken) {
    return { status: "failed", error: "invalid contact token" };
  }
  if (!customer.email) {
    return { status: "failed", error: "customer has no email" };
  }

  // Load response + survey
  const { data: response } = await supabaseAdmin
    .from("survey_responses")
    .select("id, survey_id, result_type_id, customer_id")
    .eq("id", input.responseId)
    .maybeSingle();
  if (!response || response.survey_id !== input.surveyId) {
    return { status: "failed", error: "response not found" };
  }

  const { data: survey } = await supabaseAdmin
    .from("surveys")
    .select("id, title, result_types")
    .eq("id", input.surveyId)
    .maybeSingle();
  if (!survey) {
    return { status: "failed", error: "survey not found" };
  }

  const displayName = customer.name?.trim() || customer.nickname?.trim() || "고객";
  const completeResultTypes = allSelahMoneyResults(
    Array.isArray(survey.result_types) ? survey.result_types as ResultType[] : [],
  );
  const primary = pickResultType(
    completeResultTypes,
    input.resultTypeId ?? response.result_type_id ?? undefined,
  );
  const secondary = pickResultType(completeResultTypes, input.secondaryResultTypeId);
  const faithLens = pickResultType(completeResultTypes, input.faithLensId);

  const email = buildEmailHtml({
    displayName,
    surveyTitle: survey.title ?? "셀라 진단",
    primary,
    secondary,
    faithLens,
  });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESULT_EMAIL_FROM;

  // Always log a row (pending → sent/failed)
  const { data: logRow } = await supabaseAdmin
    .from("email_logs")
    .insert({
      customer_id: customer.id,
      survey_response_id: response.id,
      survey_id: survey.id,
      email: customer.email,
      email_type: "free_result",
      status: "pending",
    })
    .select("id")
    .single();
  const logId = logRow?.id;

  if (!apiKey || !from) {
    if (logId) {
      await supabaseAdmin
        .from("email_logs")
        .update({
          status: "failed",
          error_message: "RESEND_API_KEY 또는 RESULT_EMAIL_FROM 미설정",
        })
        .eq("id", logId);
    }
    return { status: "not_configured" };
  }

  const send = await sendViaResend({
    apiKey,
    from,
    to: customer.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (send.ok) {
    if (logId) {
      await supabaseAdmin
        .from("email_logs")
        .update({
          status: "sent",
          provider_message_id: send.messageId || null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }
    return { status: "sent" };
  } else {
    if (logId) {
      await supabaseAdmin
        .from("email_logs")
        .update({ status: "failed", error_message: send.error.slice(0, 1000) })
        .eq("id", logId);
    }
    console.error("[selah] sendFreeResultEmail failed", send.error);
    return { status: "failed", error: send.error };
  }
}

// Public server function — anonymous callers allowed, authorized via contactToken.
export const sendFreeResultEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sendInput.parse(data))
  .handler(async ({ data }) => sendFreeResultEmailImpl(data));

// ---------- Admin: list logs ----------

export const listEmailLogsServer = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    const customerIds = Array.from(
      new Set((data ?? []).map((r) => r.customer_id).filter(Boolean)),
    ) as string[];
    let nameById = new Map<string, { name?: string | null; nickname?: string | null }>();
    if (customerIds.length) {
      const { data: cs } = await supabaseAdmin
        .from("customers")
        .select("id, name, nickname")
        .in("id", customerIds);
      nameById = new Map((cs ?? []).map((c) => [c.id as string, { name: c.name, nickname: c.nickname }]));
    }

    return (data ?? []).map((r) => {
      const c = r.customer_id ? nameById.get(r.customer_id) : undefined;
      return {
        id: r.id as string,
        customerId: r.customer_id as string | null,
        surveyResponseId: r.survey_response_id as string | null,
        surveyId: r.survey_id as string | null,
        email: r.email as string,
        emailType: r.email_type as string,
        status: r.status as string,
        errorMessage: r.error_message as string | null,
        providerMessageId: r.provider_message_id as string | null,
        sentAt: r.sent_at as string | null,
        createdAt: r.created_at as string,
        customerName: c?.name ?? null,
        customerNickname: c?.nickname ?? null,
      };
    });
  });

// Admin can re-send a failed free_result email by log id.
export const resendFreeResultEmailServer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => z.object({ logId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: log } = await supabaseAdmin
      .from("email_logs")
      .select("customer_id, survey_response_id, survey_id")
      .eq("id", data.logId)
      .maybeSingle();
    if (!log?.customer_id || !log.survey_response_id || !log.survey_id) {
      return { status: "failed" as const, error: "log not found or incomplete" };
    }
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("contact_token")
      .eq("id", log.customer_id)
      .maybeSingle();
    if (!customer?.contact_token) {
      return { status: "failed" as const, error: "customer token missing" };
    }
    return sendFreeResultEmailImpl({
      customerId: log.customer_id,
      contactToken: customer.contact_token,
      surveyId: log.survey_id,
      responseId: log.survey_response_id,
      resultTypeId: null,
      secondaryResultTypeId: null,
      faithLensId: null,
    });
  });
