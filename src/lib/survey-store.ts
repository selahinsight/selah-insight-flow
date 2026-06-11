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
  /** @deprecated kept for backward compat — prefer `purposes` */
  purpose?: string;
  purposes: string[];
  customPurpose?: string;
  audience: string;
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

const KEY = "selah.surveys.v2";

function isClient() {
  return typeof window !== "undefined";
}

function normalize(s: Survey): Survey {
  // migrate old data shape
  if (!s.purposes) {
    s.purposes = s.purpose ? [s.purpose] : [];
  }
  return s;
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
    return (JSON.parse(raw) as Survey[]).map(normalize);
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

// ---------- Theme-aware generator ----------

interface ThemeTemplate {
  match: (text: string) => boolean;
  typeNames: string[];
  questions: { text: string; options: string[] }[];
}

const THEMES: ThemeTemplate[] = [
  {
    match: (t) => /관계|연애|소통|가족|친밀|애착/.test(t),
    typeNames: [
      "관계 반복 패턴형",
      "감정 억압형",
      "회피/거리두기형",
      "과기능 돌봄형",
      "경계 모호형",
      "변화 준비형",
    ],
    questions: [
      {
        text: "가까운 사람과 부딪힐 때 가장 먼저 드는 마음은 무엇인가요?",
        options: [
          "또 같은 상황이 반복된다는 느낌이 든다",
          "내 감정을 말하지 못하고 삼킨다",
          "거리를 두고 혼자 정리하고 싶어진다",
          "상대를 먼저 챙기느라 나를 미룬다",
        ],
      },
      {
        text: "관계에서 자주 반복된다고 느끼는 패턴은?",
        options: [
          "내가 더 많이 주고 지친다",
          "기대했다가 실망하는 흐름",
          "갈등이 생기면 멀어진다",
          "상대의 기분에 내가 맞춰진다",
        ],
      },
      {
        text: "관계에서 가장 어려운 지점은?",
        options: [
          "내 마음을 솔직하게 말하기",
          "거절하고 경계 긋기",
          "의지하고 도움을 청하기",
          "갈등을 끝까지 다루기",
        ],
      },
      { text: "관계에서 가장 원하는 변화 한 가지를 적어주세요.", options: [] },
    ],
  },
  {
    match: (t) => /번아웃|소진|과로|지침|에너지/.test(t),
    typeNames: [
      "에너지 소진형",
      "성취 과부하형",
      "감정 회피형",
      "쉼 결핍형",
      "역할 과중형",
      "회복 진입형",
    ],
    questions: [
      {
        text: "최근 한 달, 가장 자주 느끼는 신호는?",
        options: [
          "쉬어도 회복이 안 된다",
          "잘 해내야 한다는 압박이 크다",
          "감정이 무뎌졌다",
          "사소한 일에도 짜증이 난다",
        ],
      },
      {
        text: "퇴근/일과 후 가장 자주 하는 행동은?",
        options: [
          "그대로 누워 아무것도 못한다",
          "다음 일을 미리 준비한다",
          "스크롤만 하며 시간을 보낸다",
          "다른 사람의 요청을 처리한다",
        ],
      },
      {
        text: "지금 가장 부족하다고 느끼는 것은?",
        options: ["진짜 쉬는 시간", "내 페이스대로 하는 권한", "혼자만의 회복 루틴", "감정을 나눌 사람"],
      },
      { text: "지금 가장 멈추고 싶은 한 가지를 적어주세요.", options: [] },
    ],
  },
  {
    match: (t) => /감정|회복|마음|불안|우울/.test(t),
    typeNames: [
      "감정 과부하형",
      "자기억압형",
      "방향 상실형",
      "회피/미루기형",
      "관계 의존형",
      "회복 준비형",
    ],
    questions: [
      {
        text: "요즘 가장 자주 느끼는 감정은?",
        options: [
          "쉽게 지치고 예민해진다",
          "마음은 복잡한데 표현이 어렵다",
          "관계에서 같은 상처가 반복된다",
          "무엇을 해야 할지 흐려진다",
        ],
      },
      {
        text: "감정이 무거울 때 가장 먼저 하는 행동은?",
        options: ["혼자 가만히 있는다", "할 일에 더 몰두한다", "주변에 맞추며 미룬다", "감정을 적거나 표현한다"],
      },
      {
        text: "스스로에게 가장 자주 하는 말은?",
        options: ["이 정도는 견뎌야지", "왜 또 이러지", "조금만 더 해보자", "지금 내 마음은 어떠지"],
      },
      { text: "지금 가장 회복되고 싶은 영역을 적어주세요.", options: [] },
    ],
  },
  {
    match: (t) => /방향|진로|선택|결정|커리어/.test(t),
    typeNames: [
      "방향 상실형",
      "선택 회피형",
      "과분석형",
      "기대 부응형",
      "실험 정체형",
      "방향 정렬형",
    ],
    questions: [
      {
        text: "지금 가장 가까운 상태는?",
        options: ["여러 선택지 사이에서 멈춰 있다", "결정하지 못하고 미룬다", "남의 기대에 맞춰 움직인다", "방향은 알지만 못 시작한다"],
      },
      {
        text: "선택 앞에서 가장 자주 떠오르는 생각은?",
        options: ["잘못된 선택이면 어쩌지", "지금이 맞는 시점일까", "내가 진짜 원하는 게 뭘까", "남들은 어떻게 봤을까"],
      },
      {
        text: "변화하고 싶지만 안 되는 영역은?",
        options: ["일 / 커리어", "관계", "생활 루틴", "자기 인식"],
      },
      { text: "지금 가장 분명히 하고 싶은 한 가지를 적어주세요.", options: [] },
    ],
  },
];

const DEFAULT_TEMPLATE: ThemeTemplate = {
  match: () => true,
  typeNames: [
    "감정 과부하형",
    "관계 반복 패턴형",
    "방향 상실형",
    "자기억압형",
    "회피/미루기형",
    "변화 준비형",
  ],
  questions: [
    {
      text: "요즘 자신에 대해 가장 자주 느끼는 것은?",
      options: ["쉽게 지친다", "감정이 복잡하다", "관계가 어렵다", "방향이 흐리다"],
    },
    {
      text: "스트레스 상황에서 가장 먼저 하는 행동은?",
      options: ["혼자 정리한다", "할 일에 몰두한다", "주변에 맞춘다", "감정을 표현한다"],
    },
    {
      text: "반복된다고 느끼는 자기 패턴은?",
      options: ["과하게 책임진다", "표현을 미룬다", "거리를 둔다", "선택을 미룬다"],
    },
    { text: "이 진단을 통해 가장 알고 싶은 것을 적어주세요.", options: [] },
  ],
};

function pickTemplate(title: string, purposes: string[], coreInfo: string): ThemeTemplate {
  const text = `${title} ${purposes.join(" ")} ${coreInfo}`;
  return THEMES.find((t) => t.match(text)) ?? DEFAULT_TEMPLATE;
}

export interface GenerateInputs {
  title: string;
  purposes: string[];
  customPurpose?: string;
  audience: string;
  coreInfo: string;
  questionCount: number;
  tone: string;
  resultCount: number;
  theme: Survey["theme"];
}

/**
 * Stand-alone generator. Pure function so it's easy to swap for an
 * AI Gateway call later — keep the same input/output shape.
 */
export function generateSurveyFromInputs(input: GenerateInputs): Survey {
  const id = uid("sv");
  const template = pickTemplate(input.title, input.purposes, input.coreInfo);
  const titleStem = input.title || "자기진단";

  // Build result types from template names (limited to resultCount)
  const types: ResultType[] = Array.from({ length: input.resultCount }, (_, i) => {
    const name = template.typeNames[i] ?? `유형 ${String.fromCharCode(65 + i)}`;
    const key = String.fromCharCode(65 + i);
    return {
      id: uid("t"),
      key,
      name,
      oneLiner: `${titleStem}에서 "${name}" 패턴이 두드러지는 사람`,
      features: [
        `${name}의 신호가 일상에서 반복된다`,
        "스스로의 패턴을 인식하기 시작한 단계다",
        "회복/변화 루틴이 아직 자리잡지 않았다",
      ],
      detailedBody: `당신의 응답은 "${name}" 패턴을 가리킵니다. 상세 결과지에서는 원인, 회복 단계, 추천 프로그램을 안내합니다.`,
    };
  });

  // Build questions: take from template, loop, last quarter as text
  const baseQs = template.questions;
  const questions: Question[] = Array.from({ length: input.questionCount }, (_, i) => {
    const src = baseQs[i % baseQs.length];
    const isText = src.options.length === 0 || i === input.questionCount - 1;
    return {
      id: uid("q"),
      type: isText ? "text" : "single",
      text: src.text,
      required: true,
      options: isText
        ? undefined
        : src.options.slice(0, types.length).map((label, oi) => ({
            id: uid("o"),
            label,
            typeKey: types[oi % types.length].key,
          })),
    };
  });

  const allPurposes = [...input.purposes];
  if (input.customPurpose?.trim()) allPurposes.push(input.customPurpose.trim());

  return {
    id,
    slug: slugify(input.title) + "-" + id.slice(-4),
    title: input.title,
    purposes: allPurposes,
    customPurpose: input.customPurpose,
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
      "당신의 응답을 바탕으로 가장 가까운 유형을 찾았습니다. 무료 결과지에서는 핵심 특징과 반복 패턴 1~2개, 지금 필요한 방향을 안내드립니다.",
    paidResultIntro:
      "상세 결과지에서는 감정/관계/선택 패턴, 막히는 핵심 지점, 7~14일 실행 가이드를 함께 정리해 드립니다.",
    ctaLabel: "상세 결과지 신청하기",
    ctaUrl: "",
    responses: [],
  };
}

function seed(): Survey[] {
  const s = generateSurveyFromInputs({
    title: "감정 회복 자기진단",
    purposes: ["자기 상태 진단", "반복 패턴 진단"],
    audience: "잠재고객",
    coreInfo: "현재 감정 상태, 회복 루틴, 구매 장벽",
    questionCount: 8,
    tone: "차분하고 따뜻한 톤",
    resultCount: 4,
    theme: "ivory",
  });
  s.status = "published";
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
  "자기 상태 진단",
  "반복 패턴 진단",
  "고객 유형 분류",
  "시장 조사 및 고객 언어 수집",
  "유료 상세 결과지 연결",
  "프로그램/상담 전환 연결",
  "프로그램 후기 및 변화 분석",
];

export const TONE_OPTIONS = [
  "차분하고 따뜻한 톤",
  "상담형 톤",
  "진단형 톤",
  "전문적이고 분석적인 톤",
  "부드럽지만 명확한 톤",
];

export const THEME_OPTIONS: { value: Survey["theme"]; label: string; swatch: string }[] = [
  { value: "ivory", label: "Warm Ivory", swatch: "#F4ECDC" },
  { value: "sage", label: "Soft Sage", swatch: "#C9D5C2" },
  { value: "rose", label: "Dusty Rose", swatch: "#E2B7B0" },
  { value: "blue", label: "Calm Blue", swatch: "#B8C6D6" },
  { value: "charcoal", label: "Charcoal Minimal", swatch: "#3A3A3A" },
];
