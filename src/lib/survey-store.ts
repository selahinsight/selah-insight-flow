// Selah Studio — survey store.
//
// Backed by Lovable Cloud (Supabase). This module keeps a synchronous,
// in-memory cache so existing admin/UI code that reads via `listSurveys()`,
// `getSurvey()`, `useSurvey()` etc. keeps working without turning every read
// site async. Mutations update the cache optimistically and fire a Supabase
// write in the background.
//
// SSR: all cache access is guarded by `isClient()` so server-render returns
// empty lists; hydration happens on the client on first `useSurveys()`.

import { DEFAULT_DESIGN, type DesignSettings } from "./survey-themes";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllData,
  upsertSurveyAndQuestions,
  softDeleteSurveyServer,
  hardDeleteSurveyServer,
  insertResponseServer,
  updateResponseContactServer,
  setResponseInLoungeServer,
  updateCustomerServer,
  upsertCustomerFromResponseServer,
  migrateLocalData,
  ensureFallbackSurvey,
} from "./admin.functions";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ShareCardConfig {
  enabled: boolean;
  title?: string;
  summary?: string;
  description?: string;
  hashtags?: string[];
  encouragement?: string;
  cta_text?: string;
  include_verse?: boolean;
}

export const DEFAULT_SHARE_CARD: ShareCardConfig = {
  enabled: true,
  title: undefined,
  summary: undefined,
  description: undefined,
  hashtags: [],
  encouragement: "당신의 속도로, 회복은 이미 시작되고 있어요.",
  cta_text: "나도 진단해보기",
  include_verse: true,
};

export type QuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "scale_1_5";

export interface OptionObject {
  text: string;
  resultType?: string;
  score?: number;
}
export type SurveyOption = string | OptionObject;

export function optionText(o: SurveyOption): string {
  return typeof o === "string" ? o : o.text;
}
export function optionResultType(o: SurveyOption): string | undefined {
  return typeof o === "string" ? undefined : o.resultType;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  required?: boolean;
  options?: SurveyOption[];
}

export interface ResultType {
  id: string;
  title: string;
  name?: string;
  group?: string;
  questionIds?: string[];
  summary?: string;
  description?: string;
  representative_sentence?: string;
  interpretation?: string;
  flow?: string;
  small_action?: string;
  bibleVerse?: string;
}

export type AudienceType = "general" | "christian";

export type SurveyCategory =
  | "customer_understanding"
  | "program_application"
  | "content_reaction"
  | "pre_diagnosis"
  | "feedback"
  | "other";

export const SURVEY_CATEGORIES: { value: SurveyCategory; label: string }[] = [
  { value: "customer_understanding", label: "고객 이해 설문" },
  { value: "program_application", label: "프로그램 신청 설문" },
  { value: "content_reaction", label: "콘텐츠 반응 설문" },
  { value: "pre_diagnosis", label: "사전 진단 설문" },
  { value: "feedback", label: "후기/피드백 설문" },
  { value: "other", label: "기타" },
];

export function categoryLabel(c: SurveyCategory): string {
  return SURVEY_CATEGORIES.find((x) => x.value === c)?.label ?? "기타";
}

const VALID_CATEGORIES: SurveyCategory[] = SURVEY_CATEGORIES.map((c) => c.value);

export interface Response {
  id: string;
  surveyId: string;
  submittedAt: number;
  answers: Record<string, string | string[] | number>;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  inLounge?: boolean;
  resultTypeId?: string;
}

export interface Survey {
  id: string;
  slug: string;
  title: string;
  description: string;
  completion_message: string;
  audience_type: AudienceType;
  category: SurveyCategory;
  estimated_time: string;
  bible_verse?: string;
  questions: Question[];
  resultTypes?: ResultType[];
  status: "draft" | "published" | "closed";
  createdAt: number;
  deletedAt?: number | null;
  responses: Response[];
  design_settings?: DesignSettings;
  share_card?: ShareCardConfig;
  sourceJson?: string;
}

export const STATUS_LABEL: Record<Survey["status"], string> = {
  draft: "제작중",
  published: "설문중",
  closed: "종료",
};

export interface Customer {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  createdAt: number;
  updatedAt: number;
  inLounge: boolean;
  payment_status: "unpaid" | "paid";
  payment_provider?: string;
  payment_id?: string;
  paid_at?: number | null;
}

// -----------------------------------------------------------------------------
// In-memory cache
// -----------------------------------------------------------------------------

const state = {
  surveys: [] as Survey[],
  customers: [] as Customer[],
  hydrated: false,
};

function isClient() {
  return typeof window !== "undefined";
}

function emitSurveys() {
  if (!isClient()) return;
  window.dispatchEvent(new Event("selah:surveys-changed"));
}
function emitCustomers() {
  if (!isClient()) return;
  window.dispatchEvent(new Event("selah:customers-changed"));
}

// -----------------------------------------------------------------------------
// DB row → domain mapping
// -----------------------------------------------------------------------------

type Timestamp = string | null | undefined;
function ts(v: Timestamp): number {
  return v ? new Date(v).getTime() : 0;
}

interface SurveyRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  completion_message: string;
  audience_type: string;
  category: string;
  estimated_time: string;
  bible_verse: string | null;
  result_types: unknown;
  design_settings: unknown;
  share_card: unknown;
  status: string;
  source_json: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
interface QuestionRow {
  id: string;
  survey_id: string;
  position: number;
  type: string;
  text: string;
  required: boolean;
  options: unknown;
}
interface ResponseRow {
  id: string;
  survey_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  answers: unknown;
  result_type_id: string | null;
  in_lounge: boolean;
  submitted_at: string;
}
interface CustomerRow {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  in_lounge: boolean;
  payment_status: string;
  payment_provider: string | null;
  payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapSurvey(row: SurveyRow, questions: Question[], responses: Response[]): Survey {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    completion_message: row.completion_message,
    audience_type: (row.audience_type as AudienceType) ?? "general",
    category: (row.category as SurveyCategory) ?? "other",
    estimated_time: row.estimated_time,
    bible_verse: row.bible_verse ?? undefined,
    questions,
    resultTypes: (row.result_types as ResultType[] | null) ?? undefined,
    status: (row.status as Survey["status"]) ?? "draft",
    createdAt: ts(row.created_at),
    deletedAt: row.deleted_at ? ts(row.deleted_at) : null,
    responses,
    design_settings: (row.design_settings as DesignSettings | null) ?? undefined,
    share_card: (row.share_card as ShareCardConfig | null) ?? undefined,
    sourceJson: row.source_json ?? undefined,
  };
}

function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    type: row.type as QuestionType,
    text: row.text,
    required: row.required,
    options: (row.options as SurveyOption[] | null) ?? undefined,
  };
}

function mapResponse(row: ResponseRow): Response {
  return {
    id: row.id,
    surveyId: row.survey_id,
    submittedAt: ts(row.submitted_at),
    answers: (row.answers as Record<string, string | string[] | number>) ?? {},
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    inLounge: row.in_lounge,
    resultTypeId: row.result_type_id ?? undefined,
  };
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name ?? row.nickname ?? "",
    nickname: row.nickname ?? undefined,
    email: row.email ?? "",
    createdAt: ts(row.created_at),
    updatedAt: ts(row.updated_at),
    inLounge: row.in_lounge,
    payment_status: (row.payment_status as Customer["payment_status"]) ?? "unpaid",
    payment_provider: row.payment_provider ?? undefined,
    payment_id: row.payment_id ?? undefined,
    paid_at: row.paid_at ? ts(row.paid_at) : null,
  };
}

// -----------------------------------------------------------------------------
// Hydration + localStorage migration
// -----------------------------------------------------------------------------

let hydratePromise: Promise<void> | null = null;

const LEGACY_SURVEYS_KEY = "selah.surveys.v3";
const LEGACY_CUSTOMERS_KEY = "selah.customers.v1";
const MIGRATED_FLAG_KEY = "selah.migrated.supabase.v1";

async function refreshFromServer() {
  const raw = await fetchAllData();
  const questionsBySurvey = new Map<string, Question[]>();
  for (const q of raw.questions as QuestionRow[]) {
    const list = questionsBySurvey.get(q.survey_id) ?? [];
    list.push(mapQuestion(q));
    questionsBySurvey.set(q.survey_id, list);
  }
  const responsesBySurvey = new Map<string, Response[]>();
  for (const r of raw.responses as ResponseRow[]) {
    const list = responsesBySurvey.get(r.survey_id) ?? [];
    list.push(mapResponse(r));
    responsesBySurvey.set(r.survey_id, list);
  }
  state.surveys = (raw.surveys as SurveyRow[]).map((row) =>
    mapSurvey(row, questionsBySurvey.get(row.id) ?? [], responsesBySurvey.get(row.id) ?? []),
  );
  state.customers = (raw.customers as CustomerRow[]).map(mapCustomer);
  state.hydrated = true;
  emitSurveys();
  emitCustomers();
}

async function runLocalStorageMigrationOnce() {
  if (!isClient()) return;
  if (localStorage.getItem(MIGRATED_FLAG_KEY)) return;
  let legacySurveys: Survey[] = [];
  let legacyCustomers: Customer[] = [];
  try {
    const rawS = localStorage.getItem(LEGACY_SURVEYS_KEY);
    if (rawS) legacySurveys = JSON.parse(rawS) as Survey[];
  } catch {
    legacySurveys = [];
  }
  try {
    const rawC = localStorage.getItem(LEGACY_CUSTOMERS_KEY);
    if (rawC) legacyCustomers = JSON.parse(rawC) as Customer[];
  } catch {
    legacyCustomers = [];
  }
  if (!legacySurveys.length && !legacyCustomers.length) {
    localStorage.setItem(MIGRATED_FLAG_KEY, new Date().toISOString());
    return;
  }
  try {
    const result = await migrateLocalData({
      data: {
        surveys: legacySurveys.map((s) => ({
          ...s,
          responses: s.responses ?? [],
          resultTypes: s.resultTypes,
        })),
        customers: legacyCustomers,
      },
    });
    localStorage.setItem(MIGRATED_FLAG_KEY, new Date().toISOString());
    // Keep legacy keys around; user can remove them manually via clearLegacyLocalStorage().
    console.info("[selah] localStorage → Supabase 마이그레이션 완료", result);
  } catch (err) {
    console.error("[selah] localStorage migration failed; keeping local data.", err);
  }
}

export function clearLegacyLocalStorage() {
  if (!isClient()) return;
  localStorage.removeItem(LEGACY_SURVEYS_KEY);
  localStorage.removeItem(LEGACY_CUSTOMERS_KEY);
}

export function hydrateStore(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      await refreshFromServer();
      await runLocalStorageMigrationOnce();
      // After migration, re-read to reflect any imported rows.
      if (isClient() && localStorage.getItem(MIGRATED_FLAG_KEY)) {
        await refreshFromServer();
      }
    } catch (err) {
      console.error("[selah] hydrateStore failed", err);
      state.hydrated = true; // give up rather than block forever
    }
  })();
  return hydratePromise;
}

export function isStoreHydrated() {
  return state.hydrated;
}

// -----------------------------------------------------------------------------
// Survey reads (sync, cache-backed)
// -----------------------------------------------------------------------------

export function listSurveys(): Survey[] {
  return state.surveys
    .filter((s) => !s.deletedAt)
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getSurvey(id: string): Survey | undefined {
  return state.surveys.find((s) => s.id === id);
}

export function getSurveyBySlug(slug: string): Survey | undefined {
  return state.surveys.find((s) => s.slug === slug);
}

// -----------------------------------------------------------------------------
// Survey writes (optimistic; fire-and-forget Supabase upsert)
// -----------------------------------------------------------------------------

export function upsertSurvey(s: Survey) {
  const i = state.surveys.findIndex((x) => x.id === s.id);
  if (i >= 0) state.surveys[i] = s;
  else state.surveys.push(s);
  emitSurveys();
  upsertSurveyAndQuestions({ data: s }).catch((err) => {
    console.error("[selah] upsertSurvey failed", err);
  });
}

export function softDeleteSurvey(id: string) {
  const s = state.surveys.find((x) => x.id === id);
  if (!s) return;
  s.deletedAt = Date.now();
  emitSurveys();
  softDeleteSurveyServer({ data: { id } }).catch((err) => {
    console.error("[selah] softDeleteSurvey failed", err);
  });
}

export function deleteSurvey(id: string) {
  state.surveys = state.surveys.filter((s) => s.id !== id);
  emitSurveys();
  hardDeleteSurveyServer({ data: { id } }).catch((err) => {
    console.error("[selah] deleteSurvey failed", err);
  });
}

// -----------------------------------------------------------------------------
// Responses
// -----------------------------------------------------------------------------

// addResponse is used by /s/:slug in an anon browser context. We insert via
// the anon Supabase client (RLS: INSERT allowed when survey is published) and
// optimistically update the cache. Returns a promise so /s/:slug can await it.
export async function addResponse(
  r: Response,
  auth?: { contactToken: string },
): Promise<void> {
  const s = state.surveys.find((x) => x.id === r.surveyId);
  if (s) {
    s.responses.push(r);
    emitSurveys();
  }
  try {
    if (!r.customerId || !auth?.contactToken) {
      throw new Error("customerId and contactToken are required to submit a response");
    }
    const { error } = await supabase.rpc("submit_survey_response", {
      p_response_id: r.id,
      p_survey_id: r.surveyId,
      p_customer_id: r.customerId,
      p_contact_token: auth.contactToken,
      p_answers: r.answers as never,
      p_result_type_id: r.resultTypeId ?? null,
      p_in_lounge: r.inLounge ?? false,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[selah] addResponse failed", err);
  }
}

export function updateResponseContact(
  surveyId: string,
  responseId: string,
  input: { customerId: string; customerName: string; customerEmail: string },
) {
  const s = state.surveys.find((x) => x.id === surveyId);
  const r = s?.responses.find((x) => x.id === responseId);
  if (r) {
    r.customerId = input.customerId;
    r.customerName = input.customerName;
    r.customerEmail = input.customerEmail;
    emitSurveys();
  }
  updateResponseContactServer({
    data: { surveyId, responseId, ...input },
  }).catch((err) => console.error("[selah] updateResponseContact failed", err));
}

export function setResponseInLounge(surveyId: string, responseId: string, value: boolean) {
  const s = state.surveys.find((x) => x.id === surveyId);
  const r = s?.responses.find((x) => x.id === responseId);
  if (!r) return;
  r.inLounge = value;
  let customerId: string | undefined = r.customerId;
  emitSurveys();
  if (customerId) {
    const hasAny = state.surveys.some((sv) =>
      sv.responses.some((rr) => rr.customerId === customerId && rr.inLounge),
    );
    const c = state.customers.find((x) => x.id === customerId);
    if (c) c.inLounge = hasAny;
    emitCustomers();
  }
  setResponseInLoungeServer({
    data: { surveyId, responseId, value, customerId: customerId ?? null },
  }).catch((err) => console.error("[selah] setResponseInLounge failed", err));
}

// -----------------------------------------------------------------------------
// Customers
// -----------------------------------------------------------------------------

export function listCustomers(): Customer[] {
  return state.customers.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getCustomer(id: string): Customer | undefined {
  return state.customers.find((c) => c.id === id);
}

export function getCustomerByEmail(email: string): Customer | undefined {
  const norm = email.trim().toLowerCase();
  if (!norm) return undefined;
  return state.customers.find((c) => c.email.toLowerCase() === norm);
}

// Legacy path used by the older email-at-completion flow. New flow uses
// the RPCs create_customer_contact + update_customer_contact directly.
export function upsertCustomerFromResponse(input: { name: string; email: string }): Customer {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const now = Date.now();
  const existing = state.customers.find((c) => c.email.toLowerCase() === email);
  if (existing) {
    existing.name = name || existing.name;
    existing.updatedAt = now;
    emitCustomers();
    upsertCustomerFromResponseServer({
      data: { id: existing.id, name: existing.name, email },
    }).catch((err) => console.error("[selah] upsertCustomerFromResponse failed", err));
    return existing;
  }
  const id = uid("cu");
  const c: Customer = {
    id,
    name,
    email,
    createdAt: now,
    updatedAt: now,
    inLounge: false,
    payment_status: "unpaid",
    paid_at: null,
  };
  state.customers.push(c);
  emitCustomers();
  upsertCustomerFromResponseServer({ data: { id, name, email } }).catch((err) =>
    console.error("[selah] upsertCustomerFromResponse failed", err),
  );
  return c;
}

export function updateCustomer(id: string, patch: Partial<Customer>) {
  const i = state.customers.findIndex((c) => c.id === id);
  if (i < 0) return;
  state.customers[i] = { ...state.customers[i], ...patch, updatedAt: Date.now() };
  emitCustomers();
  updateCustomerServer({ data: { id, patch } }).catch((err) =>
    console.error("[selah] updateCustomer failed", err),
  );
}

// -----------------------------------------------------------------------------
// New anon flow helpers (called directly from /s/:slug)
// -----------------------------------------------------------------------------

/** Create a customer with just a name/nickname. Returns `{ id, contact_token }`.
 * The caller should keep contact_token in memory for a later
 * `updateCustomerContact(...)` call when the respondent enters an email. */
export async function createCustomerContact(input: {
  name?: string;
  nickname?: string;
}): Promise<{ id: string; contact_token: string } | null> {
  const { data, error } = await supabase.rpc("create_customer_contact", {
    p_name: input.name ?? undefined,
    p_nickname: input.nickname ?? undefined,
  });

  if (error) {
    console.error("[selah] create_customer_contact failed", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { id: row.id as string, contact_token: row.contact_token as string };
}

export async function updateCustomerContact(input: {
  customerId: string;
  contactToken: string;
  email: string;
  marketingConsent: boolean;
  privacyConsent: boolean;
}): Promise<boolean> {
  const { data, error } = await supabase.rpc("update_customer_contact", {
    p_customer_id: input.customerId,
    p_contact_token: input.contactToken,
    p_email: input.email,
    p_marketing_consent: input.marketingConsent,
    p_privacy_consent: input.privacyConsent,
  });
  if (error) {
    console.error("[selah] update_customer_contact failed", error);
    return false;
  }
  return Boolean(data);
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || uid("s")
  );
}

// -----------------------------------------------------------------------------
// JSON schema validation
// -----------------------------------------------------------------------------

const VALID_TYPES: QuestionType[] = [
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "scale_1_5",
];

export interface ParsedSurvey {
  title: string;
  slug?: string;
  description?: string;
  completion_message?: string;
  audience_type?: AudienceType;
  category?: SurveyCategory;
  estimated_time?: string;
  bible_verse?: string;
  questions: {
    type: QuestionType;
    text: string;
    required?: boolean;
    options?: SurveyOption[];
  }[];
  resultTypes?: ResultType[];
  share_card?: ShareCardConfig;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  data?: ParsedSurvey;
}

export function validateSurveyJson(raw: string): ValidationResult {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, errors: ["JSON 형식이 올바르지 않습니다: " + (e as Error).message] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errors: ["최상위는 객체여야 합니다."] };
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.title !== "string" || !o.title.trim())
    errors.push("title은 비어있지 않은 문자열이어야 합니다.");
  if (o.audience_type && o.audience_type !== "general" && o.audience_type !== "christian")
    errors.push('audience_type은 "general" 또는 "christian"이어야 합니다.');
  if (o.category && !VALID_CATEGORIES.includes(o.category as SurveyCategory))
    errors.push(`category는 ${VALID_CATEGORIES.join(" / ")} 중 하나여야 합니다.`);
  if (!Array.isArray(o.questions) || o.questions.length === 0)
    errors.push("questions 배열이 비어있습니다.");

  const qs: ParsedSurvey["questions"] = [];
  if (Array.isArray(o.questions)) {
    o.questions.forEach((q, i) => {
      if (!q || typeof q !== "object") {
        errors.push(`questions[${i}]는 객체여야 합니다.`);
        return;
      }
      const qq = q as Record<string, unknown>;
      if (typeof qq.type !== "string" || !VALID_TYPES.includes(qq.type as QuestionType)) {
        errors.push(`questions[${i}].type은 ${VALID_TYPES.join(" / ")} 중 하나여야 합니다.`);
        return;
      }
      if (typeof qq.text !== "string" || !qq.text.trim()) {
        errors.push(`questions[${i}].text가 비어있습니다.`);
        return;
      }
      const t = qq.type as QuestionType;
      let normalizedOptions: SurveyOption[] | undefined;
      if (t === "single_choice" || t === "multiple_choice") {
        if (!Array.isArray(qq.options) || qq.options.length < 2) {
          errors.push(`questions[${i}].options는 2개 이상이어야 합니다.`);
          return;
        }
        normalizedOptions = [];
        let badOpt = false;
        for (const op of qq.options) {
          if (typeof op === "string") {
            normalizedOptions.push(op);
          } else if (
            op &&
            typeof op === "object" &&
            typeof (op as Record<string, unknown>).text === "string"
          ) {
            const oo = op as Record<string, unknown>;
            normalizedOptions.push({
              text: oo.text as string,
              resultType: typeof oo.resultType === "string" ? oo.resultType : undefined,
              score: typeof oo.score === "number" ? oo.score : undefined,
            });
          } else {
            badOpt = true;
          }
        }
        if (badOpt) {
          errors.push(
            `questions[${i}].options 항목은 문자열 또는 { text, resultType? } 객체여야 합니다.`,
          );
          return;
        }
      }
      qs.push({
        type: t,
        text: qq.text as string,
        required: qq.required as boolean | undefined,
        options: normalizedOptions,
      });
    });
  }

  let resultTypes: ResultType[] | undefined;
  if (Array.isArray(o.resultTypes)) {
    resultTypes = [];
    o.resultTypes.forEach((rt, i) => {
      if (!rt || typeof rt !== "object") {
        errors.push(`resultTypes[${i}]는 객체여야 합니다.`);
        return;
      }
      const r = rt as Record<string, unknown>;
      if (typeof r.id !== "string" || !r.id.trim()) {
        errors.push(`resultTypes[${i}].id가 필요합니다.`);
        return;
      }
      if (typeof r.title !== "string" || !r.title.trim()) {
        errors.push(`resultTypes[${i}].title이 필요합니다.`);
        return;
      }
      resultTypes!.push({
        id: r.id,
        title: r.title,
        name: typeof r.name === "string" ? r.name : undefined,
        group: typeof r.group === "string" ? r.group : undefined,
        questionIds: Array.isArray(r.questionIds)
          ? (r.questionIds as unknown[]).filter((x): x is string => typeof x === "string")
          : undefined,
        summary: typeof r.summary === "string" ? r.summary : undefined,
        description: typeof r.description === "string" ? r.description : undefined,
        representative_sentence:
          typeof r.representative_sentence === "string" ? r.representative_sentence : undefined,
        interpretation: typeof r.interpretation === "string" ? r.interpretation : undefined,
        flow: typeof r.flow === "string" ? r.flow : undefined,
        small_action: typeof r.small_action === "string" ? r.small_action : undefined,
        bibleVerse:
          typeof r.bibleVerse === "string"
            ? r.bibleVerse
            : typeof r.bible_verse === "string"
              ? (r.bible_verse as string)
              : undefined,
      });
    });
  }

  if (errors.length) return { ok: false, errors };

  const sc =
    o.share_card && typeof o.share_card === "object" && !Array.isArray(o.share_card)
      ? (o.share_card as Record<string, unknown>)
      : undefined;
  const share_card: ShareCardConfig | undefined = sc
    ? {
        enabled: sc.enabled !== false,
        title: typeof sc.title === "string" ? sc.title : undefined,
        summary: typeof sc.summary === "string" ? sc.summary : undefined,
        description: typeof sc.description === "string" ? sc.description : undefined,
        hashtags: Array.isArray(sc.hashtags)
          ? (sc.hashtags as unknown[]).filter((x): x is string => typeof x === "string")
          : undefined,
        encouragement: typeof sc.encouragement === "string" ? sc.encouragement : undefined,
        cta_text: typeof sc.cta_text === "string" ? sc.cta_text : undefined,
        include_verse: sc.include_verse !== false,
      }
    : undefined;

  const data: ParsedSurvey = {
    title: (o.title as string).trim(),
    slug: typeof o.slug === "string" ? o.slug : undefined,
    description: typeof o.description === "string" ? o.description : "",
    completion_message:
      typeof o.completion_message === "string"
        ? o.completion_message
        : "응답해 주셔서 감사합니다.",
    audience_type: (o.audience_type as AudienceType) ?? "general",
    category: (o.category as SurveyCategory) ?? "other",
    estimated_time: typeof o.estimated_time === "string" ? o.estimated_time : "약 3분",
    bible_verse: typeof o.bible_verse === "string" ? o.bible_verse : undefined,
    questions: qs,
    resultTypes,
    share_card,
  };
  return { ok: true, errors: [], data };
}

export function surveyFromParsed(p: ParsedSurvey, sourceJson: string): Survey {
  const id = uid("sv");
  const slug = (p.slug ? slugify(p.slug) : slugify(p.title)) + "-" + id.slice(-4);
  return {
    id,
    slug,
    title: p.title,
    description: p.description ?? "",
    completion_message: p.completion_message ?? "응답해 주셔서 감사합니다.",
    audience_type: p.audience_type ?? "general",
    category: p.category ?? "other",
    estimated_time: p.estimated_time ?? "약 3분",
    bible_verse: p.bible_verse,
    questions: p.questions.map((q) => ({
      id: uid("q"),
      type: q.type,
      text: q.text,
      required: q.required ?? true,
      options: q.options,
    })),
    resultTypes: p.resultTypes,
    status: "draft",
    createdAt: Date.now(),
    responses: [],
    design_settings: { ...DEFAULT_DESIGN },
    share_card: p.share_card ?? { ...DEFAULT_SHARE_CARD },
    sourceJson,
  };
}

// Compute result type from answers (most-frequent; tie → last selected).
export function computeResultType(
  survey: Survey,
  answers: Record<string, string | string[] | number>,
  orderedSelections?: { qid: string; resultType: string }[],
): ResultType | undefined {
  if (!survey.resultTypes?.length) return undefined;
  const counts: Record<string, number> = {};
  let lastResultType: string | undefined;
  for (const q of survey.questions) {
    if (q.type !== "single_choice" && q.type !== "multiple_choice") continue;
    const ans = answers[q.id];
    const picked = Array.isArray(ans) ? ans : ans !== undefined ? [String(ans)] : [];
    for (const text of picked) {
      const opt = (q.options ?? []).find((o) => optionText(o) === text);
      const rt = opt ? optionResultType(opt) : undefined;
      if (rt) {
        counts[rt] = (counts[rt] ?? 0) + 1;
        lastResultType = rt;
      }
    }
  }
  if (orderedSelections?.length) {
    lastResultType = orderedSelections[orderedSelections.length - 1].resultType;
  }
  const max = Math.max(0, ...Object.values(counts));
  if (max === 0) return undefined;
  const top = Object.entries(counts)
    .filter(([, n]) => n === max)
    .map(([k]) => k);
  const winner =
    top.length === 1
      ? top[0]
      : lastResultType && top.includes(lastResultType)
        ? lastResultType
        : top[top.length - 1];
  return survey.resultTypes.find((r) => r.id === winner);
}

// -----------------------------------------------------------------------------
// ChatGPT prompt helpers
// -----------------------------------------------------------------------------

export function buildAnalysisPrompt(s: Survey): string {
  const rows = s.responses.map((r) => ({
    submittedAt: new Date(r.submittedAt).toISOString(),
    answers: r.answers,
  }));
  return [
    `다음은 "${s.title}" 설문의 응답 데이터입니다.`,
    `설문 설명: ${s.description}`,
    `대상: ${s.audience_type === "christian" ? "기독교인" : "일반"}`,
    `질문 목록:`,
    ...s.questions.map((q, i) => `${i + 1}. (${q.type}) ${q.text}`),
    ``,
    `응답 (JSON):`,
    "```json",
    JSON.stringify(rows, null, 2),
    "```",
    ``,
    `다음 항목을 정리해주세요:`,
    `1) 응답자 유형 분류와 분포`,
    `2) 반복적으로 등장하는 패턴`,
    `3) 고객이 실제로 쓴 표현 (원문 인용)`,
    `4) 구매/참여 장벽`,
    `5) 다음에 만들면 좋을 프로그램/콘텐츠`,
  ].join("\n");
}

export function buildContentIdeaPrompt(s: Survey): string {
  return [
    `다음은 "${s.title}" 설문 응답을 기반으로 콘텐츠 아이디어를 뽑기 위한 컨텍스트입니다.`,
    `대상: ${s.audience_type === "christian" ? "기독교인" : "일반"}`,
    `설명: ${s.description}`,
    ``,
    `응답 데이터:`,
    "```json",
    JSON.stringify(
      s.responses.map((r) => r.answers),
      null,
      2,
    ),
    "```",
    ``,
    `요청:`,
    `- 응답에서 드러난 고민/언어를 기반으로 인스타그램 콘텐츠 아이디어 10개`,
    `- 각 아이디어마다 후킹 문장 1줄, 본문 핵심 1줄`,
    `- Selah 톤 (차분, 회복적, 자기인식)`,
  ].join("\n");
}

export function buildCustomerLanguageDump(s: Survey): string {
  const textAnswers: string[] = [];
  s.responses.forEach((r) => {
    Object.entries(r.answers).forEach(([qid, v]) => {
      const q = s.questions.find((x) => x.id === qid);
      if (!q) return;
      if (q.type === "short_text" || q.type === "long_text") {
        if (typeof v === "string" && v.trim()) textAnswers.push(`- ${v.trim()}`);
      }
    });
  });
  return textAnswers.length
    ? textAnswers.join("\n")
    : "(아직 주관식 응답이 없습니다.)";
}

// -----------------------------------------------------------------------------
// Response aggregations
// -----------------------------------------------------------------------------

export interface ResponseWithSurvey {
  survey: Survey;
  response: Response;
}

export function listAllResponses(): ResponseWithSurvey[] {
  const out: ResponseWithSurvey[] = [];
  for (const s of listSurveys()) {
    for (const r of s.responses) out.push({ survey: s, response: r });
  }
  return out.sort((a, b) => b.response.submittedAt - a.response.submittedAt);
}

export function listResponsesForCustomer(customerId: string): ResponseWithSurvey[] {
  return listAllResponses().filter((x) => x.response.customerId === customerId);
}

export function resultTypeForResponse(
  survey: Survey,
  response: Response,
): ResultType | undefined {
  if (response.resultTypeId && survey.resultTypes) {
    const found = survey.resultTypes.find((r) => r.id === response.resultTypeId);
    if (found) return found;
  }
  return computeResultType(survey, response.answers);
}

// -----------------------------------------------------------------------------
// Fallback survey (Selah money diagnosis) — used by /s/:slug when the DB is
// still empty. Publishes the seeded survey once to satisfy FK on responses.
// -----------------------------------------------------------------------------

export async function ensureSurveyInDatabase(survey: Survey): Promise<void> {
  try {
    await ensureFallbackSurvey({ data: survey });
  } catch (err) {
    console.error("[selah] ensureFallbackSurvey failed", err);
  }
}
