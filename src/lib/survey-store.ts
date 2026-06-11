// Mock survey store backed by localStorage. Swap for Lovable Cloud later.

export type QuestionType = "single" | "multi" | "scale" | "text";

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: { id: string; label: string; typeKey?: string }[];
  required?: boolean;
}

export interface ResultType {
  id: string;
  key: string; // e.g. "A"
  name: string;
  oneLiner: string;
  features: string[];
  detailedBody: string;
}

export interface Survey {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  audience: string; // 응답자 관계
  coreInfo: string;
  questionCount: number;
  tone: string;
  resultCount: number;
  theme: "ivory" | "sage" | "rose" | "blue" | "charcoal";
  status: "draft" | "published";
  createdAt: number;
  questions: Question[];
  resultTypes: ResultType[];
  freeResultIntro: string;
  paidResultIntro: string;
  ctaLabel: string;
  ctaUrl: string;
  responses: Response[];
}

export interface Response {
  id: string;
  surveyId: string;
  submittedAt: number;
  audience?: string;
  answers: Record<string, string | string[] | number>;
  resultTypeKey: string;
}

const KEY = "selah.surveys.v1";

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
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
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

// "AI" generator placeholder. Real call can be swapped to AI Gateway later.
export function generateSurvey(input: {
  title: string;
  purpose: string;
  audience: string;
  coreInfo: string;
  questionCount: number;
  tone: string;
  resultCount: number;
  theme: Survey["theme"];
}): Survey {
  const id = uid("sv");
  const types: ResultType[] = Array.from({ length: input.resultCount }, (_, i) => {
    const key = String.fromCharCode(65 + i);
    return {
      id: uid("t"),
      key,
      name: `유형 ${key}`,
      oneLiner: `${input.title}에서 ${key} 패턴이 두드러지는 사람`,
      features: [
        "반복되는 감정 신호를 자주 느낀다",
        "주변보다 자기 내면을 더 살핀다",
        "회복 루틴이 아직 자리잡지 않았다",
      ],
      detailedBody:
        "당신이 보여주는 응답은 특정 반복 패턴을 가리킵니다. 상세 결과지에서는 이 패턴의 원인, 회복 단계, 추천 프로그램을 안내드립니다.",
    };
  });

  const sampleStems = [
    "요즘 가장 자주 느끼는 감정은 무엇인가요?",
    "스트레스를 받을 때 가장 먼저 하는 행동은 무엇인가요?",
    "관계에서 자주 반복되는 패턴이 있다면 무엇인가요?",
    "나를 가장 지치게 하는 상황은 어떤 것인가요?",
    "최근 한 달, 가장 회복되었던 순간은 언제인가요?",
    "스스로에게 가장 자주 하는 말은 무엇인가요?",
    "변화하고 싶지만 잘 안 되는 영역이 있다면?",
    "지금 가장 필요한 한 가지를 꼽는다면?",
    "당신에게 가장 위안이 되는 환경은?",
    "이 설문을 통해 가장 알고 싶은 것은?",
  ];

  const questions: Question[] = Array.from({ length: input.questionCount }, (_, i) => {
    const stem = sampleStems[i % sampleStems.length];
    const isText = i % 4 === 3;
    return {
      id: uid("q"),
      type: isText ? "text" : "single",
      text: stem,
      required: true,
      options: isText
        ? undefined
        : types.map((t) => ({
            id: uid("o"),
            label: `${t.key} — ${["에너지가 부족하다", "생각이 많다", "관계가 어렵다", "방향이 모호하다"][i % 4]}`,
            typeKey: t.key,
          })),
    };
  });

  return {
    id,
    slug: slugify(input.title) + "-" + id.slice(-4),
    title: input.title,
    purpose: input.purpose,
    audience: input.audience,
    coreInfo: input.coreInfo,
    questionCount: input.questionCount,
    tone: input.tone,
    resultCount: input.resultCount,
    theme: input.theme,
    status: "draft",
    createdAt: Date.now(),
    questions,
    resultTypes: types,
    freeResultIntro:
      "당신의 응답을 바탕으로 가장 가까운 유형을 찾았습니다. 무료 결과지에서는 핵심 특징 3가지를 안내드립니다.",
    paidResultIntro:
      "상세 결과지에서는 반복 패턴의 원인, 회복 단계, 다음 액션을 함께 정리해 드립니다.",
    ctaLabel: "상세 결과지 신청하기",
    ctaUrl: "",
    responses: [],
  };
}

function seed(): Survey[] {
  const s = generateSurvey({
    title: "감정 회복 자기진단",
    purpose: "응답자가 자기 상태와 반복 패턴을 확인",
    audience: "잠재고객",
    coreInfo: "현재 감정 상태, 회복 루틴, 구매 장벽",
    questionCount: 8,
    tone: "차분하고 따뜻한 톤",
    resultCount: 4,
    theme: "ivory",
  });
  s.status = "published";
  // a couple of mock responses
  for (let i = 0; i < 12; i++) {
    s.responses.push({
      id: uid("r"),
      surveyId: s.id,
      submittedAt: Date.now() - i * 86400000,
      audience: ["잠재고객", "기존 고객", "콘텐츠 구독자/팔로워"][i % 3],
      answers: {},
      resultTypeKey: s.resultTypes[i % s.resultTypes.length].key,
    });
  }
  return [s];
}

export const AUDIENCE_OPTIONS = [
  "잠재고객",
  "기존 고객",
  "프로그램 참여자",
  "상담 신청자",
  "콘텐츠 구독자/팔로워",
  "기타",
];

export const PURPOSE_OPTIONS = [
  "응답자가 자기 상태와 반복 패턴을 확인",
  "고객의 실제 언어와 니즈 수집",
  "프로그램/상담 전환을 위한 진단",
  "콘텐츠 아이디어 발굴",
];

export const TONE_OPTIONS = [
  "차분하고 따뜻한 톤",
  "직설적이고 명확한 톤",
  "유머있고 가벼운 톤",
  "전문가적이고 분석적인 톤",
];

export const THEME_OPTIONS: { value: Survey["theme"]; label: string; swatch: string }[] = [
  { value: "ivory", label: "Warm Ivory", swatch: "#F6EFE4" },
  { value: "sage", label: "Soft Sage", swatch: "#C9D5C2" },
  { value: "rose", label: "Dusty Rose", swatch: "#E2B7B0" },
  { value: "blue", label: "Calm Blue", swatch: "#B8C6D6" },
  { value: "charcoal", label: "Charcoal Minimal", swatch: "#3A3A3A" },
];
