// Selah Studio — JSON-schema backed survey store (localStorage).
// Shape is intentionally close to a future Lovable Cloud table so the swap is easy.

import { DEFAULT_DESIGN, type DesignSettings } from "./survey-themes";

export interface ShareCardConfig {
  enabled: boolean;
  title?: string;
  summary?: string;       // 결과 요약 / 진단 유형명
  description?: string;   // 한 줄 설명
  hashtags?: string[];
  encouragement?: string; // 짧은 응원 문장
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
  summary?: string;
  description?: string;
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



export function softDeleteSurvey(id: string) {
  const list = readAll();
  const s = list.find((x) => x.id === id);
  if (!s) return;
  s.deletedAt = Date.now();
  writeAll(list);
}

export const STATUS_LABEL: Record<Survey["status"], string> = {
  draft: "제작중",
  published: "설문중",
  closed: "종료",
};

export interface Response {
  id: string;
  surveyId: string;
  submittedAt: number;
  answers: Record<string, string | string[] | number>;
}

const KEY = "selah.surveys.v3";

function isClient() {
  return typeof window !== "undefined";
}

function readAll(): Survey[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seeded = seed();
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as Survey[];
  } catch {
    return [];
  }
}

function writeAll(list: Survey[]) {
  if (!isClient()) return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("selah:surveys-changed"));
}

export function listSurveys(): Survey[] {
  return readAll()
    .filter((s) => !s.deletedAt)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function getSurvey(id: string): Survey | undefined {
  return readAll().find((s) => s.id === id);
}
export function getSurveyBySlug(slug: string): Survey | undefined {
  return readAll().find((s) => s.slug === slug);
}
export function upsertSurvey(s: Survey) {
  const list = readAll();
  const i = list.findIndex((x) => x.id === s.id);
  if (i >= 0) list[i] = s;
  else list.push(s);
  writeAll(list);
}
export function deleteSurvey(id: string) {
  writeAll(readAll().filter((s) => s.id !== id));
}
export function addResponse(r: Response) {
  const list = readAll();
  const s = list.find((x) => x.id === r.surveyId);
  if (!s) return;
  s.responses.push(r);
  writeAll(list);
}
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

// ---------- JSON schema validation ----------

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
  if (typeof o.title !== "string" || !o.title.trim()) errors.push("title은 비어있지 않은 문자열이어야 합니다.");
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
          } else if (op && typeof op === "object" && typeof (op as Record<string, unknown>).text === "string") {
            const oo = op as Record<string, unknown>;
            normalizedOptions.push({
              text: oo.text as string,
              resultType: typeof oo.resultType === "string" ? oo.resultType : undefined,
            });
          } else {
            badOpt = true;
          }
        }
        if (badOpt) {
          errors.push(`questions[${i}].options 항목은 문자열 또는 { text, resultType? } 객체여야 합니다.`);
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

  // resultTypes (optional)
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
        summary: typeof r.summary === "string" ? r.summary : undefined,
        description: typeof r.description === "string" ? r.description : undefined,
        bibleVerse: typeof r.bibleVerse === "string" ? r.bibleVerse : (typeof r.bible_verse === "string" ? r.bible_verse as string : undefined),
      });
    });
  }


  if (errors.length) return { ok: false, errors };

  const sc = (o.share_card && typeof o.share_card === "object" && !Array.isArray(o.share_card))
    ? (o.share_card as Record<string, unknown>)
    : undefined;
  const share_card: ShareCardConfig | undefined = sc
    ? {
        enabled: sc.enabled !== false,
        title: typeof sc.title === "string" ? sc.title : undefined,
        summary: typeof sc.summary === "string" ? sc.summary : undefined,
        description: typeof sc.description === "string" ? sc.description : undefined,
        hashtags: Array.isArray(sc.hashtags) ? (sc.hashtags as unknown[]).filter((x): x is string => typeof x === "string") : undefined,
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

// Compute result type id from answers (most-frequent; tie → last selected)
export function computeResultType(
  survey: Survey,
  answers: Record<string, string | string[] | number>,
  orderedSelections?: { qid: string; resultType: string }[],
): ResultType | undefined {
  if (!survey.resultTypes?.length) return undefined;
  const counts: Record<string, number> = {};
  let lastResultType: string | undefined;
  // Walk questions in order
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
  // Allow override via ordered selections (preserve last-pick tie-break exactness)
  if (orderedSelections?.length) {
    lastResultType = orderedSelections[orderedSelections.length - 1].resultType;
  }
  const max = Math.max(0, ...Object.values(counts));
  if (max === 0) return undefined;
  const top = Object.entries(counts).filter(([, n]) => n === max).map(([k]) => k);
  const winner = top.length === 1 ? top[0] : (lastResultType && top.includes(lastResultType) ? lastResultType : top[top.length - 1]);
  return survey.resultTypes.find((r) => r.id === winner);
}



// ---------- Seed sample ----------

function seed(): Survey[] {
  const sampleJson = JSON.stringify(
    {
      title: "감정 회복 자기진단",
      slug: "emotion-recovery",
      description:
        "지금 나의 감정 상태와 회복 자원을 살펴보는 짧은 진단입니다. 정답은 없습니다.",
      completion_message: "응답이 저장되었습니다. 곧 결과를 정리해서 알려드릴게요.",
      audience_type: "general",
      estimated_time: "약 3분",
      questions: [
        {
          type: "single_choice",
          text: "요즘 가장 자주 느끼는 감정은 무엇인가요?",
          options: ["지친다", "복잡하다", "무감각하다", "조금씩 회복 중이다"],
        },
        {
          type: "scale_1_5",
          text: "지금 내 회복 에너지를 점수로 표현한다면?",
        },
        {
          type: "multiple_choice",
          text: "최근 한 달 동안 도움이 되었던 것은? (복수 선택)",
          options: ["산책", "수면", "대화", "글쓰기", "기도/명상"],
        },
        {
          type: "long_text",
          text: "지금 가장 회복되고 싶은 영역을 적어주세요.",
        },
      ],
    },
    null,
    2,
  );
  const parsed = validateSurveyJson(sampleJson);
  if (!parsed.ok || !parsed.data) return [];
  const s = surveyFromParsed(parsed.data, sampleJson);
  s.status = "published";
  for (let i = 0; i < 6; i++) {
    s.responses.push({
      id: uid("r"),
      surveyId: s.id,
      submittedAt: Date.now() - i * 86400000,
      answers: {},
    });
  }
  return [s];
}

// ---------- ChatGPT prompt helpers ----------

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
    JSON.stringify(s.responses.map((r) => r.answers), null, 2),
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
