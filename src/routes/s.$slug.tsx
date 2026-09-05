import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import {
  computeResultType,
  optionResultType,
  optionText,
  uid,
  type Question,
  type QuestionType,
  type ResultType,
  type ShareCardConfig,
  type Survey,
  type SurveyOption,
  type AudienceType,
  type SurveyCategory,
} from "@/lib/survey-store";
import { supabase } from "@/integrations/supabase/client";
import { sendStudioIntake } from "@/lib/studio-intake.functions";
import { allSelahMoneyResults, classifySelahMoneyDiagnosis, customerFaithResultTitle } from "@/lib/selah-money-results";


import {
  DEFAULT_DESIGN,
  THEMES,
  bodyFamilyOf,
  buttonClasses,
  cardClasses,
  fontFamilyOf,
  headingFamilyOf,
  type DesignSettings,
  type ThemeColors,
} from "@/lib/survey-themes";
import { ResultShareCard } from "@/components/survey/result-share-card";
import { ResultDiagnosisCard } from "@/components/survey/result-diagnosis-card";
import { SelahMoneyResultTemplate } from "@/components/survey/selah-money-result-template";
import { SelahMoneyEditorialResult } from "@/components/survey/selah-money-editorial-result";
import { SELAH_MONEY_RESULT_TEMPLATE_CONTENT } from "@/lib/selah-money-result-template";
import { ArrowRight, Check, CircleDollarSign, Download, Fingerprint, GitBranch, Heart, Instagram, Mail, ScanSearch, Share2, Sprout, X, Youtube } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/s/$slug")({
  component: SurveyRoute,
});

function SurveyRoute() {
  const { slug } = Route.useParams();
  return <RespondentSurvey slug={slug} />;
}

function scoreForStudio(question: Question, answer: string | string[] | number | undefined): number | undefined {
  const value = Array.isArray(answer) ? answer[0] : answer;

  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;

  const numeric = value.match(/[1-4]/)?.[0];
  if (numeric) return Number(numeric);

  const option = question.options?.find((candidate) => optionText(candidate) === value);
  if (typeof option === "object" && option !== null && typeof option.score === "number") {
    return option.score;
  }

  return undefined;
}

function answersForStudio(
  survey: Survey,
  answers: Record<string, string | string[] | number>,
): Record<string, unknown> {
  return Object.fromEntries(
    survey.questions.map((question) => {
      const answer = answers[question.id];
      const score = scoreForStudio(question, answer);

      return [
        question.id,
        score === undefined
          ? answer
          : {
              answer,
              score,
            },
      ];
    }),
  );
}

export function RespondentSurvey({ slug }: { slug: string }) {
  const isSelahMoneyDiagnosis = slug === "selah-money-diagnosis" || slug === "selah-money-d";
  const [survey, setSurvey] = useState<Survey | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function loadPublishedStudioSurvey(): Promise<Survey | null> {
      if (!isSelahMoneyDiagnosis) return null;

      // Selah Studio의 반영 완료 버전을 공개 설문의 단일 기준 데이터로 사용합니다.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("studio_surveys")
        .select("*")
        .eq("slug", "selah-money-diagnosis")
        .eq("status", "published")
        .not("published_version", "is", null)
        .maybeSingle();
      if (error || !data) return null;

      const content = data.content && typeof data.content === "object" ? data.content : {};
      const start = content.start && typeof content.start === "object" ? content.start : {};
      const completion = content.completion && typeof content.completion === "object" ? content.completion : {};
      return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        description: data.description || start.description || "",
        completion_message: completion.description || "응답해주셔서 감사합니다.",
        audience_type: "christian",
        category: "pre_diagnosis",
        estimated_time: start.estimatedTime || "약 3~4분",
        bible_verse: undefined,
        questions: Array.isArray(content.questions)
          ? prepareSelahMoneyQuestions(content.questions)
          : [],
        resultTypes: allSelahMoneyResults(Array.isArray(content.results) ? content.results : []),
        status: "published",
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        deletedAt: null,
        responses: [],
        design_settings: data.theme || undefined,
      } as Survey;
    }

    async function loadFallbackSurvey(): Promise<Survey | null> {
      if (!isSelahMoneyDiagnosis) return null;

      const response = await fetch("/selah-money-diagnosis-survey-json.txt");
      if (!response.ok) return null;

      const fallback = (await response.json()) as Survey;
      return {
        ...fallback,
        id: fallback.id || "selah-money-diagnosis",
        slug: fallback.slug || "selah-money-diagnosis",
        questions: prepareSelahMoneyQuestions(fallback.questions ?? []),
        resultTypes: allSelahMoneyResults(fallback.resultTypes ?? []),
        status: "published",
        responses: fallback.responses ?? [],
        createdAt: fallback.createdAt ?? Date.now(),
      };
    }

    async function load() {
      if (isSelahMoneyDiagnosis) {
        const published = await loadPublishedStudioSurvey();
        if (cancelled) return;
        setSurvey(published || (await loadFallbackSurvey()));
        return;
      }

      const { data: surveyRow, error: surveyErr } = await supabase
        .from("surveys")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (cancelled) return;
      if (surveyErr) {
        console.error("[selah] load survey failed", surveyErr);
        setSurvey(await loadFallbackSurvey());
        return;
      }
      if (!surveyRow) {
        setSurvey(await loadFallbackSurvey());
        return;
      }
      const { data: qRows, error: qErr } = await supabase
        .from("survey_questions")
        .select("*")
        .eq("survey_id", surveyRow.id)
        .order("position", { ascending: true });
      if (cancelled) return;
      if (qErr) {
        console.error("[selah] load questions failed", qErr);
        setSurvey(await loadFallbackSurvey());
        return;
      }
      const questions: Question[] = (qRows ?? []).map((q) => ({
        id: q.id,
        type: q.type as QuestionType,
        text: q.text,
        required: q.required,
        options: (q.options as SurveyOption[] | null) ?? undefined,
      }));
      const s: Survey = {
        id: surveyRow.id,
        slug: surveyRow.slug,
        title: surveyRow.title,
        description: surveyRow.description ?? "",
        completion_message: surveyRow.completion_message ?? "응답해주셔서 감사합니다.",
        audience_type: (surveyRow.audience_type as AudienceType) ?? "general",
        category: (surveyRow.category as SurveyCategory) ?? "other",
        estimated_time: surveyRow.estimated_time ?? "약 3분",
        bible_verse: surveyRow.bible_verse ?? undefined,
        questions,
        resultTypes: (surveyRow.result_types as ResultType[] | null) ?? undefined,
        status: surveyRow.status as Survey["status"],
        createdAt: surveyRow.created_at ? new Date(surveyRow.created_at).getTime() : Date.now(),
        deletedAt: null,
        responses: [],
        design_settings: (surveyRow.design_settings as DesignSettings | null) ?? undefined,
        share_card: (surveyRow.share_card as ShareCardConfig | null) ?? undefined,
        sourceJson: surveyRow.source_json ?? undefined,
      };
      setSurvey(s);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isSelahMoneyDiagnosis, slug]);

  if (survey === undefined) {
    if (isSelahMoneyDiagnosis) {
      return (
        <div className="money-loading">
          <img src="/selah-insight-logo-transparent.png" alt="Selah Insight" />
          <p>설문을 불러오는 중입니다.</p>
        </div>
      );
    }
    return (
      <Wrap theme={THEMES[DEFAULT_DESIGN.theme]} design={DEFAULT_DESIGN}>
        <p style={{ fontSize: 20 }}>설문을 불러오는 중입니다.</p>
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>잠시만 기다려주세요.</p>
      </Wrap>
    );
  }

  if (survey === null) {
    return (
      <Wrap theme={THEMES[DEFAULT_DESIGN.theme]} design={DEFAULT_DESIGN}>
        <p style={{ fontSize: 24 }}>설문을 찾을 수 없습니다.</p>
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>
          링크가 만료되었거나 비공개로 전환되었을 수 있습니다.
        </p>
      </Wrap>
    );
  }

  const design: DesignSettings = { ...DEFAULT_DESIGN, ...(survey.design_settings ?? {}) };
  const theme = THEMES[design.theme] ?? THEMES[DEFAULT_DESIGN.theme];
  return <Runner survey={survey} design={design} theme={theme} />;
}

type Phase = "intro" | "prep" | "questions" | "done";

interface SelahMoneyResult {
  primaryMoneyType?: ResultType;
  primaryMoneyTypes: ResultType[];
  secondaryMoneyType?: ResultType;
  faithLenses: ResultType[];
  primaryFaithLens?: ResultType;
  scores: Record<string, { total: number; average: number }>;
  includedMoneyTypeIds?: string[];
  hasMoneyTie?: boolean;
}

function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function buildResultEmailContent(args: {
  name: string;
  surveyTitle: string;
  primary?: ResultType;
  secondary?: ResultType;
  faith?: ResultType;
}) {
  const displayName = args.name.trim() || "고객";
  const subject = `[셀라인사이트] ${displayName}님의 셀라 머니 진단 결과가 도착했습니다`;
  const text = `${displayName}님의 셀라 머니 진단 결과가 도착했습니다. 아래 결과 이미지를 확인해주세요.`;
  const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#f7f1e8;color:#3d3028;font-family:Arial,'Noto Sans KR',sans-serif"><main style="max-width:780px;margin:auto;background:#fffdf8;padding:36px 22px 22px;text-align:center"><p style="margin:0 0 10px;color:#a36f58;font-size:12px;letter-spacing:.18em">SELAH INSIGHT</p><h1 style="margin:0 0 10px;font:400 26px/1.45 Georgia,'Noto Serif KR',serif">${escapeEmailHtml(displayName)}님의<br>셀라 머니 진단 결과가 도착했습니다</h1><p style="margin:0;color:#76675c;font-size:14px;line-height:1.8">아래에서 진단 결과를 확인해보세요.</p></main></body></html>`;
  return { subject, html, text };
}

function quoteRepresentativeSentence(sentence: string): string {
  const trimmed = sentence.trim().replace(/^[‘’'“”"]+|[‘’'“”"]+$/g, "");
  return `‘${trimmed}’`;
}

const MONEY_QUESTION_BREAKS_BY_SOURCE_INDEX: Record<number, string[]> = {
  1: ["카드값을", "자꾸"],
  2: ["않아도"],
  3: ["보면", "때가"],
  4: ["때"],
  5: ["확인하려 하면"],
  6: ["생기면", "마음이 크게"],
  7: ["결정할 때", "보일지가"],
  8: ["써도 돼'", "많이"],
  9: ["것이"],
  10: ["휴식처럼", "소비도"],
  11: ["보면", "같은"],
  12: ["받으면"],
  13: ["세우려다가도"],
  14: ["내역을"],
  15: ["능력과"],
  16: ["불안과"],
  17: ["미뤘다가"],
  18: ["준비해도", "느낌이"],
  19: ["의식해"],
  20: ["되지만,"],
  21: ["마음이"],
  22: ["문제지만,", "문제라고"],
  23: ["데도", "불편할 때가"],
  24: ["할 때", "잘"],
  25: ["쓸 때"],
  26: ["할 때", "고려하고"],
  27: ["것 같아"],
  28: ["할 때"],
  29: ["못했을 때"],
  30: ["하나님께"],
};

const MONEY_QUESTION_TEXT_OVERRIDES: Record<number, string> = {
  1: "통장 잔고나 카드값을 확인해야 한다고 생각하면서도 자꾸 미룬다.",
  2: "지금 돈이 부족하지 않아도 앞으로 부족해질 것 같아 걱정된다.",
  3: "SNS나 주변 사람의 소비를 보면 내 삶이 뒤처진 것처럼 느껴질 때가 있다.",
  4: "지치거나 허전할 때 무언가를 사고 싶어진다.",
  5: "내 수입과 지출을 확인하려 하면 마음이 무겁고 복잡해진다.",
  6: "예상하지 못한 지출이 생기면 금액이 크지 않아도 마음이 크게 흔들린다.",
  7: "돈을 쓸지 결정할 때 다른 사람에게 어떻게 보일지가 영향을 준다.",
  8: "'이 정도는 나를 위해 써도 돼'라는 마음으로 계획보다 많이 쓸 때가 있다.",
  9: "내 재정 상태를 정확히 마주하는 것이 왠지 불편할 때가 있다.",
  10: "건강, 배움, 휴식처럼 나를 위한 소비도 나중에 돈이 부족할까 봐 망설인다.",
  11: "주변 사람들의 씀씀이를 보면 나도 그 정도는 써야 할 것 같은 부담을 느낀다.",
  12: "스트레스를 많이 받으면 쇼핑, 배달 등에 쓰는 돈이 늘어난다.",
  13: "예산을 세우려다가도 머리가 복잡해져 끝내지 못한다.",
  14: "통장 잔액이나 지출 내역을 자주 확인해야 마음이 놓인다.",
  15: "소득이나 가진 것이 내 능력과 가치를 보여준다고 느낄 때가 있다.",
  17: "돈 문제를 미뤘다가 나중에 더 큰 불안을 느끼는 일이 종종 있다.",
  18: "저축하고 미래를 준비해도 아직 충분하지 않다는 느낌이 자주 든다.",
  19: "주변의 시선이나 분위기를 의식해 평소보다 돈을 더 쓸 때가 있다.",
  20: "돈을 쓰면 잠시 위로가 되지만, 시간이 지나면 다시 허전해진다.",
  21: "돈을 더 많이 벌고 싶다는 마음이 욕심처럼 느껴질 때가 있다.",
  22: "헌금과 나눔은 신앙의 문제지만, 소비·저축·투자는 현실의 문제라고 느껴진다.",
  23: "나에게 필요한 돈을 썼는데도 하나님 앞에서 마음이 불편할 때가 있다.",
  24: "돈과 관련된 선택을 할 때 말씀을 어떻게 적용해야 할지 잘 모르겠다.",
  25: "쉼과 회복을 위해 돈을 쓸 때 하나님보다 나를 먼저 생각하는 것 같아 망설일 때가 있다.",
  26: "돈과 관련된 결정을 할 때 현실적인 상황을 먼저 고려하고 말씀은 나중에 생각하는 편이다.",
  27: "하나님보다 돈을 앞세우는 것 같아 투자나 자산 형성을 망설일 때가 있다.",
  28: "돈과 관련된 결정을 할 때 말씀을 떠올리는 것이 익숙하지 않다.",
  29: "돈 관리를 잘하지 못했을 때 믿음이 부족한 것 같아 자책할 때가 있다.",
  30: "돈에 대한 고민을 하나님께 솔직히 이야기하는 것이 익숙하지 않다.",
};

// 각 유형의 생각→감정→행동→결과 순서는 유지하면서 신앙 문항을 고르게 섞습니다.
const MONEY_QUESTION_ORDER = [
  1, 2, 21, 3, 22, 4,
  5, 23, 6, 7, 24, 8,
  9, 10, 25, 11, 12, 26,
  13, 27, 14, 15, 28, 16,
  17, 18, 29, 19, 30, 20,
] as const;

function prepareSelahMoneyQuestions(questions: Question[]): Question[] {
  const canonical = questions.map((question, index) => ({
    ...question,
    text: MONEY_QUESTION_TEXT_OVERRIDES[index + 1] ?? question.text,
  }));

  if (canonical.length !== MONEY_QUESTION_ORDER.length) return canonical;
  return MONEY_QUESTION_ORDER.map((sourceIndex) => canonical[sourceIndex - 1]);
}

const MONEY_QUESTION_BREAKS_BY_TEXT = Object.fromEntries(
  Object.entries(MONEY_QUESTION_BREAKS_BY_SOURCE_INDEX).flatMap(([sourceIndex, markers]) => {
    const text = MONEY_QUESTION_TEXT_OVERRIDES[Number(sourceIndex)];
    return text ? [[text, markers]] : [];
  }),
) as Record<string, string[]>;

function renderMoneyQuestion(text: string, questionNumber: number): ReactNode {
  const markers = MONEY_QUESTION_BREAKS_BY_TEXT[text];
  if (!markers?.length) return text;

  const output: ReactNode[] = [];
  let rest = text;
  for (const marker of markers) {
    const markerIndex = rest.indexOf(marker);
    if (markerIndex < 0) continue;
    const end = markerIndex + marker.length;
    output.push(rest.slice(0, end), <br key={`${questionNumber}-${marker}`} />);
    rest = rest.slice(end).trimStart();
  }
  output.push(rest);
  return output;
}

function Runner({
  survey,
  design,
  theme,
}: {
  survey: Survey;
  design: DesignSettings;
  theme: ThemeColors;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [result, setResult] = useState<ResultType | undefined>(undefined);
  const [selahResult, setSelahResult] = useState<SelahMoneyResult | undefined>(undefined);
  const [responseId, setResponseId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [sensitiveInfoConsent, setSensitiveInfoConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [starting, setStarting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [editorialPreview, setEditorialPreview] = useState(false);
  const [customerContact, setCustomerContact] = useState<
    { id: string; contactToken: string } | null
  >(null);
  const lastPickRef = useRef<{ qid: string; resultType: string } | null>(null);
  const emailCaptureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (survey.slug !== "selah-money-diagnosis" || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const isShortResultPreview =
      window.location.pathname.replace(/\/+$/, "").endsWith("/s/selah-money-d");
    if (!isShortResultPreview && params.get("preview") !== "result") return;

    let cancelled = false;
    void (async () => {
      const hasPrivatePreviewKey =
        isShortResultPreview ||
        params.get("previewKey") === "7e1b5a62-3c94-4f87-a6d2-91b84c57ef30";

      if (!hasPrivatePreviewKey) {
        const { data: userResult } = await supabase.auth.getUser();
        const user = userResult.user;
        if (!user || cancelled) return;

        const { data: isAdmin, error } = await supabase.rpc("is_admin", { _user_id: user.id });
        if (error || !isAdmin || cancelled) return;
      }

      const byId = (id: string | null) => survey.resultTypes?.find((item) => item.id === id);
      const primaryMoneyTypes = (
        params.get("primary") ??
        params.get("type") ??
        (isShortResultPreview ? "money_combo_organize_reward" : "organizing_delay")
      )
        .split(",")
        .map((id) => byId(id.trim()))
        .filter((item): item is ResultType => Boolean(item));
      const primary = primaryMoneyTypes[0];
      if (!primary) return;

      const faithLenses = (
        params.get("faith") ??
        (isShortResultPreview
          ? "faith_low"
          : "")
      )
        .split(",")
        .map((id) => byId(id.trim()))
        .filter((item): item is ResultType => Boolean(item));
      const faith = faithLenses[0];

      setName("김다윗");
      setResult(primary);
      setSelahResult({
        primaryMoneyType: primary,
        primaryMoneyTypes,
        secondaryMoneyType: undefined,
        faithLenses,
        primaryFaithLens: faith,
        scores: {},
      });
      setPreviewMode(true);
      setEditorialPreview(
        params.get("layout") === "editorial",
      );
      setPhase("done");
    })();

    return () => {
      cancelled = true;
    };
  }, [survey]);

  useEffect(() => {
    if (phase === "intro" || typeof window === "undefined") return;
    const resetViewport = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetViewport();
    const frameId = window.requestAnimationFrame(resetViewport);
    const timeoutId = window.setTimeout(resetViewport, 120);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [phase]);

  const total = survey.questions.length;
  const q = survey.questions[i];
  const progress = phase === "done" ? 100 : (i / total) * 100;
  const currentAnswer = answers[q.id];
  const hasCurrentAnswer = q.required === false || (
    Array.isArray(currentAnswer)
      ? currentAnswer.length > 0
      : typeof currentAnswer === "string"
        ? currentAnswer.trim().length > 0
        : currentAnswer !== undefined
  );

  async function startSurvey() {
    if (starting) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("이름 또는 닉네임을 입력해주세요.");
      return;
    }
    if (survey.slug === "selah-money-diagnosis" && (!privacyConsent || !sensitiveInfoConsent)) {
      toast.error("진단을 시작하려면 두 가지 필수 동의가 필요합니다.");
      return;
    }
    setStarting(true);
    try {
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Create a customer record now (no email yet). Only name/nickname.
      const contact = { id: uid("cu"), contact_token: uid("ct") };
      if (!contact) {
        toast.error("시작에 실패했어요. 다시 시도해주세요.");
        return;
      }
      setCustomerContact({ id: contact.id, contactToken: contact.contact_token });
      if (survey.slug === "selah-money-diagnosis" && typeof window !== "undefined") {
        await new Promise((resolve) => window.setTimeout(resolve, 300));
      }
      setPhase(survey.slug === "selah-money-diagnosis" ? "prep" : "questions");
    } finally {
      setStarting(false);
    }
  }

  function next() {
    if (q.required !== false && answers[q.id] === undefined) {
      toast.error("답을 선택해주세요.");
      return;
    }
    if (i < total - 1) setI(i + 1);
    else completeSurvey();
  }

  function completeSurvey() {
    const selah = computeSelahMoneyResult(survey, answers);
    const rt =
      selah?.primaryMoneyType ??
      computeResultType(
        survey,
        answers,
        lastPickRef.current ? [lastPickRef.current] : undefined,
      );
    const id = uid("r");
    setResponseId(id);
    setResult(rt);
    setSelahResult(selah);
    setPhase("done");
    if (survey.slug === "selah-money-diagnosis") {
      void sendStudioIntake({
        data: {
          email: null,
          name: name.trim() || undefined,
          responseId: id,
          surveyId: survey.id || survey.slug,
          surveySlug: survey.slug,
          surveyTitle: survey.title,
          answers: {
            ...answersForStudio(survey, answers),
            __contact: { email: trimmedEmail },
            __consents: {
              privacy: true,
              sensitiveInfo: true,
              consentVersion: "2026-08-27-v2",
              identifiableRetention: "3_years",
              anonymousStatisticsRetention: "indefinite",
            },
            ...(selah ? {
              __diagnosis_result: {
                scoringVersion: "2026-07-17",
                scores: selah.scores,
                moneyResultCode: rt?.id,
                faithResultCode: selah.primaryFaithLens?.id,
                includedMoneyTypeIds: selah.includedMoneyTypeIds ?? [],
                hasMoneyTie: selah.hasMoneyTie ?? false,
              },
            } : {}),
          },
          resultTypeId: rt?.id,
          primaryMoneyTypeId: selah?.primaryMoneyType?.id,
          secondaryMoneyTypeId: selah?.secondaryMoneyType?.id,
          primaryFaithLensId: selah?.primaryFaithLens?.id,
          privacyConsent: true,
          marketingConsent: false,
        },
      }).then((studioRes) => {
        if (studioRes.status !== "saved") console.warn("[selah] diagnosis completion save was not completed", studioRes);
      }).catch((error) => console.warn("[selah] diagnosis completion save failed", error));
    }
  }

  async function submitEmailRequest() {
    if (submitting) return;
    const emailInput = document.querySelector<HTMLInputElement>("[data-result-email]");
    const trimmedEmail = (emailInput?.value || email).trim();
    if (!trimmedEmail) {
      toast.error("이메일을 입력해주세요.");
      return;
    }
    if (!/.+@.+\..+/.test(trimmedEmail)) {
      toast.error("이메일 형식을 확인해주세요.");
      return;
    }
    if (!privacyConsent) {
      toast.error("결과 저장을 위해 필수 동의가 필요합니다.");
      return;
    }

    setSubmitting(true);
    try {
      let resultImage: { dataUrl: string; filename: string } | undefined;
      if (isMoneyDiagnosis && emailCaptureRef.current) {
        await document.fonts?.ready;
        const node = emailCaptureRef.current;
        node.setAttribute("data-capturing-email", "true");
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        let dataUrl: string;
        try {
          dataUrl = await toPng(node, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: theme.bg,
            width: node.scrollWidth,
            height: node.scrollHeight,
          });
        } finally {
          node.removeAttribute("data-capturing-email");
        }
        if (dataUrl.length > 24_000_000) {
          throw new Error("결과 이미지 용량이 너무 큽니다.");
        }
        resultImage = { dataUrl, filename: "selah-money-result.png" };
      }

      const emailContent = buildResultEmailContent({
        name,
        surveyTitle: survey.title,
        primary: result,
        secondary: selahResult?.secondaryMoneyType,
        faith: selahResult?.primaryFaithLens,
      });
      const studioRes = await sendStudioIntake({
        data: {
          email: trimmedEmail,
          name: name.trim() || undefined,
          responseId: responseId ?? uid("r"),
          surveyId: survey.id || survey.slug,
          surveySlug: survey.slug,
          surveyTitle: survey.title,
          answers: {
            ...answersForStudio(survey, answers),
            __consents: {
              privacy: true,
              sensitiveInfo: sensitiveInfoConsent,
              resultEmail: true,
              marketing: marketingConsent,
              consentVersion: "2026-09-01-v3",
            },
            ...(selahResult ? {
              __diagnosis_result: {
                scoringVersion: "2026-07-17",
                scores: selahResult.scores,
                moneyResultCode: result?.id,
                faithResultCode: selahResult.primaryFaithLens?.id,
                includedMoneyTypeIds: selahResult.includedMoneyTypeIds ?? [],
                hasMoneyTie: selahResult.hasMoneyTie ?? false,
              },
            } : {}),
          },
          resultTypeId: result?.id,
          primaryMoneyTypeId: selahResult?.primaryMoneyType?.id,
          secondaryMoneyTypeId: selahResult?.secondaryMoneyType?.id,
          primaryFaithLensId: selahResult?.primaryFaithLens?.id,
          privacyConsent: true,
          marketingConsent,
          emailContent: { ...emailContent, resultImage },
        },
      });

      if (studioRes.status !== "sent") {
        console.warn("[selah] Selah Studio intake was not completed", studioRes);
        toast.error("결과 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      setEmailSaved(true);
      toast.success("전체 결과를 이메일로 보내드렸습니다.");
    } catch (err) {
      console.error("[selah] submitEmailRequest failed", err);
      toast.error("저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }
  function computeSelahMoneyResult(
    currentSurvey: Survey,
    currentAnswers: Record<string, string | string[] | number>,
  ): SelahMoneyResult | undefined {

    const hasSelahTypes = currentSurvey.resultTypes?.some((rt) => rt.id === "organizing_delay");
    if (!hasSelahTypes) return undefined;
    type ScoreGroup = "organizing_delay" | "safety_seeking" | "gaze_sensitive" | "emotional_reward" | "faith_burden" | "faith_separation";
    const totals: Record<ScoreGroup, number> = {
      organizing_delay: 0,
      safety_seeking: 0,
      gaze_sensitive: 0,
      emotional_reward: 0,
      faith_burden: 0,
      faith_separation: 0,
    };

    for (const question of currentSurvey.questions) {
      const resultType = question.options?.map(optionResultType).find(Boolean);
      if (!resultType || !(resultType in totals)) continue;
      const answer = currentAnswers[question.id];
      totals[resultType as ScoreGroup] += scoreForStudio(question, answer) ?? 0;
    }
    const classified = classifySelahMoneyDiagnosis(totals, currentSurvey.resultTypes ?? []);
    return {
      primaryMoneyType: classified.moneyResult,
      primaryMoneyTypes: [classified.moneyResult],
      secondaryMoneyType: undefined,
      faithLenses: [classified.faithResult],
      primaryFaithLens: classified.faithResult,
      scores: classified.scores,
      includedMoneyTypeIds: classified.includedMoneyTypeIds,
      hasMoneyTie: classified.hasMoneyTie,
    };
  }

  const btnPrimary = buttonClasses(design.button_style, theme);
  const cardStyle = cardClasses(design.card_style, theme);
  const headingFont = headingFamilyOf(design.font_mood);
  const isMoneyDiagnosis = survey.slug === "selah-money-diagnosis";
  const [introSubtitle, ...introBodyParts] = (survey.description ?? "").split(/\n\n+/);
  const introBody = introBodyParts.join("\n\n");

  if (phase === "intro") {
    return (
      <Wrap theme={theme} design={design} introMode={isMoneyDiagnosis}>
        <div
          className={isMoneyDiagnosis ? "money-intro-card" : undefined}
          style={{
            ...cardStyle,
            borderRadius: 8,
            padding: "48px 42px 40px",
            textAlign: "center",
            border: `1px solid ${theme.border}`,
          }}
        >
          <p
            className={isMoneyDiagnosis ? "money-diagnosis-label money-intro-sans" : undefined}
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: theme.accent,
              textTransform: "uppercase",
            }}
          >
            SELAH MONEY DIAGNOSIS
          </p>
          <h1
            className={isMoneyDiagnosis ? "money-intro-title" : undefined}
            style={{
              marginTop: 18,
              maxWidth: 620,
              marginLeft: "auto",
              marginRight: "auto",
              fontSize: "clamp(30px, 6vw, 44px)",
              lineHeight: 1.28,
              color: theme.text,
              fontFamily: isMoneyDiagnosis ? undefined : headingFont,
              fontWeight: 700,
            }}
          >
            {isMoneyDiagnosis ? (
              <>
                <span className="money-intro-line">돈 때문에</span>{" "}
                <span className="money-intro-line">마음이 불편한가요?</span>
              </>
            ) : survey.title}
          </h1>

          {isMoneyDiagnosis ? (
            <>
              <p
                className="money-intro-description money-intro-lead"
                style={{ margin: "24px auto 0", maxWidth: 540, fontSize: 16, lineHeight: 1.8, color: theme.text, opacity: 0.78 }}
              >
                그 불편함에는 이유가 있습니다.
              </p>
              <p
                className="money-intro-description money-intro-flow money-intro-body"
                style={{ margin: "16px auto 0", maxWidth: 540, fontSize: 16, lineHeight: 1.8, color: theme.text, opacity: 0.78 }}
              >
                  <span className="money-intro-line">셀라 머니 진단을 통해</span>{" "}
                  <span className="money-intro-line">돈을 대하는 내 마음과 행동을 확인해보세요.</span>
              </p>
            </>
          ) : (
            <>
              {introSubtitle && <p style={{ margin: "16px auto 0", maxWidth: 480 }}>{introSubtitle}</p>}
              {introBody && <p className="whitespace-pre-line" style={{ margin: "26px auto 0", maxWidth: 500 }}>{introBody}</p>}
              <p style={{ marginTop: 22, fontSize: 13, color: theme.muted }}>{survey.estimated_time}</p>
            </>
          )}
          {survey.audience_type === "christian" && survey.bible_verse && (
            <div
              style={{
                margin: "24px auto 0",
                maxWidth: 420,
                padding: 16,
                borderRadius: 8,
                backgroundColor: theme.bg,
                fontStyle: "italic",
                color: theme.accent,
                fontSize: isMoneyDiagnosis ? 16 : 14,
              }}
            >
              {survey.bible_verse}
            </div>
          )}
          {!isMoneyDiagnosis && (
            <p style={{ marginTop: 28, fontSize: 14, color: theme.text, opacity: 0.75 }}>
              정답은 없습니다. 지금의 상태와 가장 가까운 답을 선택해주세요.
            </p>
          )}
          <div className={isMoneyDiagnosis ? "money-name-field" : undefined} style={{ marginTop: 24, maxWidth: isMoneyDiagnosis ? 380 : 320, marginLeft: "auto", marginRight: "auto" }}>
            <label
              htmlFor="respondent-name"
              style={{
                display: "block",
                fontSize: 12,
                letterSpacing: isMoneyDiagnosis ? 0 : "0.14em",
                color: theme.muted,
                marginBottom: 8,
                textAlign: isMoneyDiagnosis ? "center" : "left",
                textTransform: "uppercase",
              }}
            >
              이름 또는 닉네임을 적어주세요
            </label>
            <input
              id="respondent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isMoneyDiagnosis ? "이름 또는 닉네임 입력" : "예: 지혜 / 회복중인 사람"}
              autoComplete="off"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.bg,
                color: theme.text,
                fontSize: 14,
                textAlign: "center",
                outline: "none",
              }}
            />
            {!isMoneyDiagnosis && (
              <p style={{ marginTop: 8, fontSize: 12, color: theme.muted, textAlign: "center" }}>
                이메일은 진단이 끝난 뒤에만 선택적으로 받습니다.
              </p>
            )}
          </div>
          {isMoneyDiagnosis && (
            <div className="money-intro-consent-block">
              <label className="money-email-consent money-intro-consent" style={{ color: theme.muted }}>
                <input checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} type="checkbox" />
                <span>진단 결과 확인을 위한 개인정보 수집·이용에 동의합니다. (필수)</span>
              </label>
              <label className="money-email-consent money-intro-consent" style={{ color: theme.muted }}>
                <input checked={sensitiveInfoConsent} onChange={(event) => setSensitiveInfoConsent(event.target.checked)} type="checkbox" />
                <span>진단 결과 분석을 위한 신앙 관련 민감정보 수집·이용에 동의합니다. (필수)</span>
              </label>
            </div>
          )}
          <button
            className={isMoneyDiagnosis ? "money-start-button" : undefined}
            onClick={() => {
              void startSurvey();
            }}
            disabled={starting || !name.trim() || (isMoneyDiagnosis && (!privacyConsent || !sensitiveInfoConsent))}
            style={{
              ...btnPrimary,
              marginTop: 24,
              padding: "13px 34px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: starting ? "wait" : "pointer",
              opacity: !name.trim() || (isMoneyDiagnosis && (!privacyConsent || !sensitiveInfoConsent)) ? 0.5 : 1,
            }}
          >
            {starting ? "준비 중..." : isMoneyDiagnosis ? "진단 시작하기" : "시작하기"}
          </button>
          {isMoneyDiagnosis && (
            <p className="money-duration" style={{ marginTop: 14, fontSize: 13, color: theme.muted, textAlign: "center" }}>
              총 30문항 · 약 3~4분 소요
            </p>
          )}
          {isMoneyDiagnosis && (
            <details className="money-intro-privacy-details" style={{ color: theme.muted }}>
              <summary>개인정보 및 민감정보 수집·이용 안내 보기</summary>
              <div>
                <p><strong>수집·이용 주체</strong></p>
                <p>셀라 인사이트(Selah Insight)</p>
                <p><strong>개인정보 수집·이용</strong></p>
                <p>수집 항목: 이름 또는 닉네임, 돈 관련 진단 응답과 결과, 응답 일시</p>
                <p>이용 목적: 진단 결과 산출·제공·확인, 문의 대응, 서비스 운영 및 개인을 알아볼 수 없도록 처리한 통계 작성</p>
                <p><strong>신앙 관련 민감정보 수집·이용</strong></p>
                <p>수집 항목: 신앙 관련 진단 응답과 그에 따라 산출된 신앙 유형</p>
                <p>이용 목적: 신앙 관련 진단 결과 산출·제공·확인 및 개인을 알아볼 수 없도록 처리한 통계 작성</p>
                <p><strong>보유 및 이용 기간</strong></p>
                <p>개인을 알아볼 수 있는 개인정보와 민감정보는 수집일로부터 3년간 보유한 뒤 지체 없이 파기하거나 복원이 불가능한 방식으로 익명 처리합니다. 법령에 따라 별도 보관이 필요한 경우에는 해당 법정 기간 동안 분리 보관합니다.</p>
                <p>이름·연락처·응답 식별정보를 제거하여 합리적인 방법으로도 개인을 알아볼 수 없도록 만든 익명 통계는 서비스 개선과 연구·통계 분석을 위해 기간 제한 없이 보관할 수 있습니다.</p>
                <p><strong>동의 거부 및 삭제 요청</strong></p>
                <p>각 동의를 거부할 수 있으나, 진단 결과 산출에 필요한 정보이므로 필수 동의가 없으면 진단에 참여할 수 없습니다. 보유기간 전이라도 셀라 인사이트 문의 채널을 통해 열람·정정·삭제 또는 처리 정지를 요청할 수 있으며, 다른 법령상 보존 의무가 없는 정보는 확인 후 지체 없이 처리합니다.</p>
              </div>
            </details>
          )}
        </div>
      </Wrap>
    );
  }

  if (phase === "prep") {
    return (
      <Wrap theme={theme} design={design} introMode>
        <div
          className="money-prep-card"
          style={{
            ...cardStyle,
            borderRadius: 8,
            padding: "48px 42px 40px",
            textAlign: "center",
            border: `1px solid ${theme.border}`,
          }}
        >
          <div className="money-prep-content">
          <p
            className="money-diagnosis-label money-intro-sans"
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: theme.accent,
              textTransform: "uppercase",
            }}
          >
            SELAH MONEY DIAGNOSIS
          </p>
          <h1 className="money-intro-title money-prep-title">
            <span className="money-prep-line">진단 전,</span>
            <span className="money-prep-line">이것만 기억해주세요</span>
          </h1>
          <p className="money-prep-research">
            <span className="money-prep-line">이 진단지는 돈에 대한 태도와 크리스천의 돈·신앙</span>
            <span className="money-prep-line">인식을 다룬 국내외 연구와 통계자료를 바탕으로</span>
              <span className="money-prep-line">구성되었습니다.</span>
          </p>
          <div className="money-prep-guidance">
            <h2>
              <span className="money-prep-line">최근 6개월간의</span>
              <span className="money-prep-line">나의 실제 모습을 떠올려주세요.</span>
            </h2>
            <p>
              <span className="money-prep-line">좋아 보이는 답이 아니라,</span>
              <span className="money-prep-line">실제로 자주 했던 선택에 따라 답해주세요.</span>
            </p>
          </div>
          <p className="money-prep-final">
            <span className="money-prep-line">솔직하게 답할수록 돈·신앙 유형을</span>
            <span className="money-prep-line">더 정확히 알 수 있습니다.</span>
          </p>
          </div>
          <button
            className="money-start-button"
            onClick={() => setPhase("questions")}
            style={{
              ...btnPrimary,
              marginTop: 24,
              padding: "13px 34px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            진단 시작하기
          </button>
        </div>
      </Wrap>
    );
  }


  if (phase === "done") {
    if (result) {
      return (
        <Wrap theme={theme} design={design} introMode>
          <div ref={isMoneyDiagnosis ? emailCaptureRef : undefined} className={isMoneyDiagnosis ? "money-email-capture-content" : undefined}>
          <div
            className={`money-result-card${editorialPreview ? " money-editorial-result-shell" : ""}`}
            style={{
              ...cardStyle,
              borderRadius: 8,
              padding: 36,
              border: `1px solid ${theme.border}`,
            }}
          >
            {previewMode && !editorialPreview && (
              <p
                style={{
                  marginBottom: 14,
                  fontSize: 12,
                  color: theme.accent,
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                관리자 결과 미리보기 · 데이터가 저장되지 않습니다
              </p>
            )}
            <p
              className={`money-diagnosis-label${editorialPreview ? " money-editorial-intro-label" : ""}`}
              style={{ fontSize: 15, letterSpacing: "0.05em", color: theme.accent, textAlign: "center" }}
            >
              SELAH MONEY DIAGNOSIS
            </p>
            <h1
              className={`money-result-complete-title${editorialPreview ? " money-editorial-intro-title" : ""}`}
              style={{
                marginTop: 18,
                fontSize: 22,
                lineHeight: 1.55,
                color: theme.text,
                textAlign: "center",
                fontFamily: headingFont,
              }}
            >
              {editorialPreview ? "진단이 완료되었어요" : "진단이 완료되었습니다."}
            </h1>
            <p className={`money-result-complete-subtitle${editorialPreview ? " money-editorial-intro-subtitle" : ""}`} style={{ marginTop: 10, fontSize: 17, lineHeight: 1.65, color: theme.text, textAlign: "center", whiteSpace: editorialPreview ? "normal" : "nowrap" }}>
              {editorialPreview ? "지금부터 나의 돈 반응과 그 안에 담긴 마음을 차분히 살펴볼게요." : "이제 나의 돈 반응 유형을 살펴볼게요."}
            </p>
            <div className={`money-result-divider${editorialPreview ? " money-editorial-intro-divider" : ""}`} style={{ backgroundColor: theme.border }} aria-hidden="true" />

            {editorialPreview && selahResult?.primaryFaithLens && SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id] && SELAH_MONEY_RESULT_TEMPLATE_CONTENT[selahResult.primaryFaithLens.id] && (
              <SelahMoneyEditorialResult
                name={name.trim()}
                moneyContent={SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id]}
                faithContent={SELAH_MONEY_RESULT_TEMPLATE_CONTENT[selahResult.primaryFaithLens.id]}
                faithTitle={customerFaithResultTitle(selahResult.primaryFaithLens.id, selahResult.primaryFaithLens.title)}
                theme={theme}
              />
            )}
            {!editorialPreview && <>
            {SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id]?.sceneHook && (
              <div
                className="money-scene-hook-card"
                style={{
                  margin: "28px auto 46px",
                  maxWidth: 440,
                  padding: "22px 22px 24px",
                  borderRadius: 0,
                  backgroundColor: theme.bg,
                  border: `1px solid ${theme.accent}66`,
                  color: theme.text,
                  textAlign: "center",
                }}
              >
                <p
                  className="money-scene-hook-body"
                  style={{
                    fontSize: 16,
                    letterSpacing: "-0.01em",
                    color: theme.accent,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                >
                  <ScanSearch size={20} strokeWidth={1.7} aria-hidden="true" />
                  <span>혹시 이런 모습이 익숙한가요?</span>
                </p>
                <p
                  style={{
                    marginTop: 16,
                    fontSize: 17,
                    lineHeight: 1.65,
                    color: theme.text,
                    fontWeight: 600,
                    fontFamily: '"SUIT", ui-sans-serif, system-ui, sans-serif',
                    whiteSpace: "pre-line",
                    wordBreak: "keep-all",
                    overflowWrap: "break-word",
                  }}
                >
                  {SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id].sceneHook}
                </p>
              </div>
            )}

            <ResultSectionTitle theme={theme}>
              <span className="money-desktop-copy">나의 주된 돈 반응 유형</span>
              <span className="money-mobile-copy">{name.trim()}님의 주된 돈 반응 유형</span>
            </ResultSectionTitle>
            <h2 className="money-result-type-box" style={{ marginTop: 18, fontSize: 18, lineHeight: 1.35, color: theme.text, textAlign: "center", fontFamily: headingFont }}>
              <CircleDollarSign size={20} strokeWidth={1.6} aria-hidden="true" />
              <span>{(selahResult?.primaryMoneyTypes.length ?? 0) > 1 ? "돈 반응 복합형" : (SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id]?.title ?? result.title)}</span>
            </h2>
            {(selahResult?.primaryMoneyTypes.length ?? 0) > 1 && (
              <h3 className="money-composite-member-title" style={{ color: theme.text }}>{result.title}</h3>
            )}
            {SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id] && (
              <SelahMoneyResultTemplate
                content={SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id]}
                theme={theme}
              />
            )}
            {!SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id] && result.representative_sentence && (
              <p className="money-result-bubble" style={{ marginTop: 18, fontSize: 15, color: theme.accent, textAlign: "center" }}>
                {result.id === "organizing_delay" ? (
                  <>
                    <span className="money-desktop-copy">{quoteRepresentativeSentence(result.representative_sentence)}</span>
                    <span className="money-mobile-copy">“지금 확인하면<br />더 불안해질 것 같아.”</span>
                  </>
                ) : quoteRepresentativeSentence(result.representative_sentence)}
              </p>
            )}
            {!SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id] && result.summary && (
              <p style={{ marginTop: 20, fontSize: 17, lineHeight: 1.7, color: theme.text, opacity: 0.85, textAlign: "center" }}>
                {result.summary}
              </p>
            )}
            {!SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id] && result.description && (
              <p className="whitespace-pre-line money-result-description" style={{ marginTop: 18, maxWidth: 440, marginLeft: "auto", marginRight: "auto", fontSize: 16, lineHeight: 1.75, color: theme.text, opacity: 0.8, textAlign: "center" }}>
                {result.id === "organizing_delay" ? (
                  <>
                    <span className="money-desktop-copy">{result.description}</span>
                    <span className="money-mobile-copy">돈을 정확히 마주하는 순간<br />마음이 무거워져 확인과 정리를<br />뒤로 미루는 유형이에요.</span>
                  </>
                ) : result.description}
              </p>
            )}
            {!SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id] && result.interpretation && (
              <div style={{ marginTop: 22, padding: 18, borderRadius: 8, backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                <p className="money-result-box-title" style={{ color: theme.accent }}>
                  <ScanSearch size={21} strokeWidth={1.7} aria-hidden="true" />
                  <span>이 유형의 특징</span>
                </p>
                <div className="money-result-paragraphs money-result-interpretation-paragraphs">
                  {result.interpretation.split(/\n\n+/).map((paragraph, index) => (
                    <p key={paragraph} style={{ fontSize: 16, lineHeight: 1.75, color: theme.text, opacity: 0.84, fontWeight: index === 0 ? 600 : 400 }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {!SELAH_MONEY_RESULT_TEMPLATE_CONTENT[result.id] && result.flow && (
              <div style={{ marginTop: 16, padding: 18, borderRadius: 8, backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                <p className="money-result-box-title" style={{ color: theme.accent }}>
                  <GitBranch size={21} strokeWidth={1.7} aria-hidden="true" />
                  <span>반복되는 마음의 흐름</span>
                </p>
                <div className="money-flow-steps">
                  {result.flow
                    .split("\n")
                    .map((line) => line.replace(/^[→>↓\s]+/, "").replace(/[→>↓\s]+$/, "").trim())
                    .filter(Boolean)
                    .map((step, index, steps) => (
                      <div key={step}>
                        <div className="money-flow-step" style={{ color: theme.text, borderColor: theme.border }}>
                          {step}
                        </div>
                        {index < steps.length - 1 && <div className="money-flow-arrow" style={{ color: theme.accent }}>↓</div>}
                      </div>
                    ))}
                </div>
              </div>
            )}
            {selahResult?.primaryMoneyTypes.slice(1).map((moneyType) => (
              <div className="money-composite-member" key={moneyType.id} style={{ borderColor: theme.border }}>
                <h3 className="money-composite-member-title" style={{ color: theme.text }}>{moneyType.title}</h3>
                {SELAH_MONEY_RESULT_TEMPLATE_CONTENT[moneyType.id] && (
                  <SelahMoneyResultTemplate content={SELAH_MONEY_RESULT_TEMPLATE_CONTENT[moneyType.id]} theme={theme} />
                )}
                {!SELAH_MONEY_RESULT_TEMPLATE_CONTENT[moneyType.id] && moneyType.representative_sentence && (
                  <p className="money-result-bubble" style={{ marginTop: 16, fontSize: 15, color: theme.accent, textAlign: "center" }}>
                    {quoteRepresentativeSentence(moneyType.representative_sentence)}
                  </p>
                )}
                {!SELAH_MONEY_RESULT_TEMPLATE_CONTENT[moneyType.id] && moneyType.description && (
                  <p style={{ marginTop: 18, fontSize: 16, lineHeight: 1.7, color: theme.text, opacity: 0.84, textAlign: "center" }}>
                    {moneyType.description}
                  </p>
                )}
                {!SELAH_MONEY_RESULT_TEMPLATE_CONTENT[moneyType.id] && moneyType.interpretation && (
                  <div style={{ marginTop: 18, padding: 18, borderRadius: 8, backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                    <p className="money-result-box-title" style={{ color: theme.accent }}>
                      <ScanSearch size={21} strokeWidth={1.7} aria-hidden="true" />
                      <span>이 유형의 특징</span>
                    </p>
                    <div className="money-result-paragraphs">
                      {moneyType.interpretation.split(/\n\n+/).map((paragraph, index) => (
                        <p key={paragraph} style={{ fontSize: 16, lineHeight: 1.75, color: theme.text, opacity: 0.84, fontWeight: index === 0 ? 600 : 400 }}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {selahResult?.primaryFaithLens && (
              <>
                <div className="money-result-section-divider" style={{ backgroundColor: theme.border }} aria-hidden="true" />
                <div
                  className="money-faith-transition"
                  style={{
                    margin: "54px auto 48px",
                    maxWidth: 420,
                    textAlign: "center",
                  }}
                >
                  <Sprout size={22} strokeWidth={1.6} color={theme.accent} aria-hidden="true" />
                  <p
                    className="money-faith-transition-title"
                    style={{
                      marginTop: 12,
                      fontSize: 20,
                      lineHeight: 1.7,
                      color: theme.text,
                      fontWeight: 600,
                    }}
                  >
                    그렇다면,
                    <br />
                    이런 돈 앞의 마음은
                    <br />
                    <span style={{ color: theme.accent }}>하나님과의 관계에서는</span>
                    <br />
                    어떻게 나타날까요?
                  </p>
                  <p
                    aria-hidden="true"
                    style={{
                      marginTop: 24,
                      fontSize: 24,
                      lineHeight: 1,
                      color: theme.accent,
                      fontWeight: 400,
                    }}
                  >
                    ↓
                  </p>
                </div>
                <ResultSectionTitle theme={theme}>
                  <span className="money-desktop-copy">돈과 신앙 사이의 마음 유형</span>
                  <span className="money-mobile-copy">{name.trim()}님의 돈을 대하는 신앙 유형</span>
                </ResultSectionTitle>
                <h2 className="money-result-type-box money-faith-type-box" style={{ marginTop: 18, fontSize: 18, lineHeight: 1.35, color: theme.text, textAlign: "center", fontFamily: headingFont }}>
                  <Heart size={20} strokeWidth={1.6} aria-hidden="true" />
                  <span>{customerFaithResultTitle(selahResult.primaryFaithLens.id, selahResult.primaryFaithLens.title)}</span>
                </h2>
                {SELAH_MONEY_RESULT_TEMPLATE_CONTENT[selahResult.primaryFaithLens.id] && (
                  <SelahMoneyResultTemplate content={SELAH_MONEY_RESULT_TEMPLATE_CONTENT[selahResult.primaryFaithLens.id]} theme={theme} />
                )}
                {selahResult.faithLenses.slice(1).map((lens) => {
                  const template = SELAH_MONEY_RESULT_TEMPLATE_CONTENT[lens.id];
                  if (!template) return null;
                  return (
                    <div key={lens.id} style={{ marginTop: 36 }}>
                      <div className="money-result-section-divider" style={{ backgroundColor: theme.border }} aria-hidden="true" />
                      <h2 className="money-result-type-box money-faith-type-box" style={{ marginTop: 20, fontSize: 18, lineHeight: 1.35, color: theme.text, textAlign: "center", fontFamily: headingFont }}>
                        <Heart size={20} strokeWidth={1.6} aria-hidden="true" />
                        <span>{customerFaithResultTitle(lens.id, lens.title)}</span>
                      </h2>
                      <SelahMoneyResultTemplate content={template} theme={theme} />
                    </div>
                  );
                })}
                {selahResult.faithLenses.slice(1).map((lens) => (
                  SELAH_MONEY_RESULT_TEMPLATE_CONTENT[lens.id] ? null : (
                  <div className="money-faith-detail" key={lens.id} style={{ marginTop: 18, padding: 18, borderRadius: 8, backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                    {selahResult.faithLenses.length > 1 && (
                      <h3 className="money-composite-member-title" style={{ color: theme.text }}>{lens.title}</h3>
                    )}
                    {lens.id === "faith_low" ? (
                      <>
                        <div className="money-mobile-copy money-faith-low-summary">
                          <section>
                            <h3>핵심 진단</h3>
                            <p className="money-faith-low-core">돈과 신앙의 관계를 비교적 편안하게<br />받아들이고 있습니다.</p>
                          </section>
                          <section>
                            <h3>현재 모습</h3>
                            <p>돈을 벌고 쓰고 모으고 누리는 과정<br />에서 신앙적 부담과 내적 갈등이<br />적게 나타납니다.</p>
                          </section>
                          <section className="money-faith-low-standards">
                            <h3>돈을 다루는 기준</h3>
                            <ul>
                              <li>소비에 담고 싶은 믿음</li>
                              <li>저축과 투자의 목적</li>
                              <li>나눔을 선택하는 기준</li>
                            </ul>
                          </section>
                          <p className="money-faith-low-direction">소비·저축·투자·나눔에 담고 싶은<br />믿음과 삶의 목적을 구체적으로 세우<br />면 하나님이 맡기신 돈을 지혜롭고<br />일관되게 관리할 수 있습니다.</p>
                        </div>
                        <div className="money-desktop-copy money-faith-paragraphs" style={{ maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                          {lens.description?.split(/\n\n+/).map((paragraph, index) => (
                            <p key={paragraph} style={{ fontSize: 16, lineHeight: 1.58, color: theme.text, opacity: index === 0 ? 0.86 : 0.82, textAlign: "center", fontWeight: index === 0 ? 600 : 400 }}>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </>
                    ) : lens.description && (
                      <div className="money-faith-paragraphs" style={{ marginTop: selahResult.faithLenses.length > 1 ? 12 : 0, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                        {lens.description.split(/\n\n+/).map((paragraph, index) => (
                          <p key={paragraph} style={{ fontSize: 16, lineHeight: 1.58, color: theme.text, opacity: index === 0 ? 0.86 : 0.82, textAlign: "center", fontWeight: index === 0 ? 600 : 400 }}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    )}
                    {lens.interpretation && (
                      <div className="money-faith-paragraphs" style={{ marginTop: 13 }}>
                        {lens.interpretation.split(/\n\n+/).map((paragraph) => (
                          <p key={paragraph} style={{ fontSize: 16, lineHeight: 1.58, color: theme.text, opacity: 0.82 }}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  )
                ))}
              </>
            )}
            </>}
            {!isMoneyDiagnosis && (result.bibleVerse || (survey.audience_type === "christian" && survey.bible_verse)) && (
              <div
                style={{
                  marginTop: 24,
                  padding: 16,
                  borderRadius: 8,
                  backgroundColor: theme.bg,
                  borderLeft: `3px solid ${theme.accent}`,
                  fontStyle: "italic",
                  color: theme.text,
                  fontSize: 16,
                }}
              >
                {result.bibleVerse ?? survey.bible_verse}
              </div>
            )}
            {!isMoneyDiagnosis && survey.completion_message && (
              <p className="whitespace-pre-line" style={{ marginTop: 22, fontSize: 13, color: theme.muted, textAlign: "center" }}>
                {survey.completion_message}
              </p>
            )}
          </div>

          {isMoneyDiagnosis && (
            <MoneyPaidDiagnosisSection
              theme={theme}
              design={design}
              moneyTitle={result.title}
              faithTitle={selahResult?.primaryFaithLens
                ? customerFaithResultTitle(selahResult.primaryFaithLens.id, selahResult.primaryFaithLens.title)
                : "신앙 유형"}
            />
          )}
          {isMoneyDiagnosis && (
            <div className="money-email-social-capture" aria-hidden="true">
              <FunnelCtas theme={theme} design={design} isMoneyDiagnosis />
            </div>
          )}
          </div>

          {!(result.id === "money_no_clear_pattern" && selahResult?.primaryFaithLens?.id === "faith_low") && (
            <>
              <EmailResultSection
                isMoneyDiagnosis={isMoneyDiagnosis}
                name={name}
                email={email}
                privacyConsent={privacyConsent}
                marketingConsent={marketingConsent}
                submitting={submitting}
                saved={emailSaved}
                theme={theme}
                design={design}
                onEmailChange={setEmail}
                onPrivacyConsentChange={setPrivacyConsent}
                onMarketingConsentChange={setMarketingConsent}
                onSubmit={() => {
                  if (previewMode) {
                    toast.info("미리보기에서는 데이터를 저장하지 않습니다.");
                    return;
                  }
                  void submitEmailRequest();
                }}
              />

              {!isMoneyDiagnosis && <FunnelCtas theme={theme} design={design} isMoneyDiagnosis={false} />}
              {!isMoneyDiagnosis && <ResultActions survey={survey} result={result} design={design} theme={theme} />}
            </>
          )}

          {isMoneyDiagnosis && <FunnelCtas theme={theme} design={design} isMoneyDiagnosis />}
        </Wrap>
      );
    }

    return (
      <Wrap theme={theme} design={design}>
        <div
          style={{
            ...cardStyle,
            borderRadius: 8,
            padding: 36,
            textAlign: "center",
            border: `1px solid ${theme.border}`,
          }}
        >
          <h1 style={{ fontSize: 28, color: theme.text, fontFamily: headingFont }}>제출이 완료되었습니다</h1>
          <p
            className="whitespace-pre-line"
            style={{
              marginTop: 18,
              fontSize: 14,
              color: theme.text,
              opacity: 0.78,
            }}
          >
            {survey.completion_message}
          </p>
          {survey.audience_type === "christian" && survey.bible_verse && (
            <div
              style={{
                margin: "24px auto 0",
                maxWidth: 420,
                padding: 16,
                borderRadius: 8,
                backgroundColor: theme.bg,
                fontStyle: "italic",
                color: theme.accent,
                fontSize: 14,
              }}
            >
              {survey.bible_verse}
            </div>
          )}
        </div>

        {survey.share_card?.enabled !== false && (
          <ShareSection survey={survey} design={design} theme={theme} />
        )}
      </Wrap>

    );
  }

  // questions
  return (
    <Wrap theme={theme} design={design}>
      <div style={{ marginBottom: 24 }}>
        <div
          className={isMoneyDiagnosis ? "money-question-progress-meta" : undefined}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: theme.muted,
            marginBottom: 8,
          }}
        >
          <span>
            문항 {String(i + 1).padStart(2, "0")} / {total}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 999,
            backgroundColor: theme.border,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: theme.progress,
              transition: "width 200ms ease",
            }}
          />
        </div>
      </div>

      <div
        className={isMoneyDiagnosis ? "money-question-card" : undefined}
        style={{ ...cardStyle, borderRadius: 8, padding: "34px 30px", border: `1px solid ${theme.border}` }}
      >
        <p
          className={isMoneyDiagnosis ? "money-diagnosis-label money-intro-sans" : undefined}
          style={{ marginBottom: 14, fontSize: isMoneyDiagnosis ? 15 : 11, letterSpacing: "0.18em", color: theme.accent, textAlign: "center" }}
        >
          {isMoneyDiagnosis ? "SELAH MONEY DIAGNOSIS" : "SELAH MONEY CHECK"}
        </p>
        <h2
          className={isMoneyDiagnosis ? "money-question-title" : undefined}
          style={{ fontSize: 25, lineHeight: 1.55, color: theme.text, fontFamily: headingFont, textAlign: "center", fontWeight: 500 }}
        >
          {isMoneyDiagnosis ? renderMoneyQuestion(q.text, i + 1) : q.text}
        </h2>

        <div
          className={isMoneyDiagnosis ? "money-question-options" : undefined}
          style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 12 }}
        >
          {q.type === "short_text" && (
            <input
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.bg,
                color: theme.text,
                fontSize: 14,
                outline: "none",
              }}
              placeholder="답을 입력해주세요"
            />
          )}
          {q.type === "long_text" && (
            <textarea
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              rows={5}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.bg,
                color: theme.text,
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
              placeholder="편하게 적어주세요"
            />
          )}
          {q.type === "scale_1_5" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = answers[q.id] === n;
                return (
                  <button
                    key={n}
                    onClick={() => {
                      if (active) {
                        const nextAnswers = { ...answers };
                        delete nextAnswers[q.id];
                        setAnswers(nextAnswers);
                      } else {
                        setAnswers({ ...answers, [q.id]: n });
                      }
                    }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      fontSize: 14,
                      cursor: "pointer",
                      backgroundColor: active ? theme.accent : theme.bg,
                      color: active ? theme.accentText : theme.text,
                      border: `1px solid ${active ? theme.accent : theme.border}`,
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          )}
          {(q.type === "single_choice" || q.type === "multiple_choice") &&
            (q.options ?? []).map((opt, oi) => {
              const label = optionText(opt);
              const current = answers[q.id];
              const isMulti = q.type === "multiple_choice";
              const selected = isMulti
                ? Array.isArray(current) && current.includes(label)
                : current === label;
              return (
                <button
                  key={`${label}-${oi}`}
                  onClick={() => {
                    if (isMulti) {
                      const arr = Array.isArray(current) ? [...current] : [];
                      const idx = arr.indexOf(label);
                      if (idx >= 0) arr.splice(idx, 1);
                      else arr.push(label);
                      setAnswers({ ...answers, [q.id]: arr });
                    } else if (selected) {
                      const nextAnswers = { ...answers };
                      delete nextAnswers[q.id];
                      setAnswers(nextAnswers);
                    } else {
                      setAnswers({ ...answers, [q.id]: label });
                    }
                    const rt = optionResultType(opt);
                    if (rt && !isMulti) {
                      // track last selected resultType for tie-break
                      lastPickRef.current = { qid: q.id, resultType: rt };
                    }
                  }}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    borderRadius: 8,
                    border: `1px solid ${selected ? theme.selected : theme.border}`,
                    backgroundColor: selected ? theme.bg : theme.surface,
                    color: theme.text,
                    fontSize: 16,
                    lineHeight: 1.5,
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <span>{label}</span>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: `1px solid ${selected ? theme.selected : theme.border}`,
                      backgroundColor: selected ? theme.selected : "transparent",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {selected && (
                      <svg viewBox="0 0 10 10" width="10" height="10">
                        <path d="M1 5 L4 8 L9 2" stroke="#fff" strokeWidth="1.8" fill="none" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => {
            if (i === 0 && isMoneyDiagnosis) setPhase("prep");
            else setI(Math.max(0, i - 1));
          }}
          disabled={i === 0 && !isMoneyDiagnosis}
          style={{
            padding: "12px 32px",
            borderRadius: 999,
            fontSize: 15,
            color: theme.text,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            cursor: i === 0 && !isMoneyDiagnosis ? "default" : "pointer",
            opacity: i === 0 && !isMoneyDiagnosis ? 0.4 : 1,
          }}
        >
          이전
        </button>
        <button
          onClick={next}
          disabled={!hasCurrentAnswer}
          style={{
            ...btnPrimary,
            padding: "12px 32px",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 500,
            cursor: hasCurrentAnswer ? "pointer" : "default",
            opacity: hasCurrentAnswer ? 1 : 0.45,
          }}
        >
          {i === total - 1 ? "결과 보기" : "다음"}
        </button>
      </div>
    </Wrap>
  );
}

function ShareSection({
  survey,
  design,
  theme,
}: {
  survey: Survey;
  design: DesignSettings;
  theme: ThemeColors;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/s/${survey.slug}`;
    QRCode.toDataURL(url, { margin: 1, width: 320 })
      .then((d) => setQrDataUrl(d))
      .catch(() => undefined);
  }, [survey.slug]);


  async function renderPng(): Promise<Blob | null> {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      width: 1080,
      height: 1350,
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  async function handleDownload() {
    try {
      setBusy(true);
      const blob = await renderPng();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "selah-diagnosis-result.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("결과 카드를 저장했어요.");
    } catch (e) {
      toast.error("저장에 실패했어요.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    try {
      setBusy(true);
      const blob = await renderPng();
      if (!blob) return;
      const file = new File([blob], "selah-diagnosis-result.png", { type: "image/png" });
      const text = "나의 Selah 진단 결과를 확인했어요. 당신도 한 번 해보세요.";
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data?: ShareData) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], text, title: survey.title });
      } else {
        // fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "selah-diagnosis-result.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.info("브라우저에서 공유용 이미지를 저장했어요.");
      }
    } catch (e) {
      // Cancelled share isn't a real error
      const err = e as Error;
      if (err.name !== "AbortError") {
        toast.error("공유에 실패했어요.");
        console.error(e);
      }
    } finally {
      setBusy(false);
    }
  }

  const btn = buttonClasses(design.button_style, theme);

  return (
    <>
      <div
        style={{
          ...cardClasses(design.card_style, theme),
          marginTop: 16,
          borderRadius: 24,
          padding: 28,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 14, color: theme.text, opacity: 0.8 }}>
          진단 결과를 저장하거나 공유해보세요.
        </p>
        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleDownload}
            disabled={busy}
            style={{
              ...btn,
              padding: "12px 22px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              cursor: busy ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Download size={14} /> 결과 카드 저장하기
          </button>
          <button
            onClick={handleShare}
            disabled={busy}
            style={{
              ...btn,
              padding: "12px 22px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              cursor: busy ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: 0.92,
            }}
          >
            <Share2 size={14} /> 이미지로 공유하기
          </button>
        </div>
      </div>

      {/* Off-screen high-res card used as the capture source */}
      <div
        style={{
          position: "fixed",
          left: -99999,
          top: 0,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <ResultShareCard ref={cardRef} survey={survey} design={design} qrDataUrl={qrDataUrl} />
      </div>

    </>
  );
}

function ResultSectionTitle({ children, theme }: { children: React.ReactNode; theme: ThemeColors }) {
  return (
    <p
      className="money-result-section-title"
      style={{
        marginTop: 44,
        fontSize: 18,
        color: theme.accent,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        textAlign: "center",
      }}
    >
      {children}
    </p>
  );
}

function EmailResultSection({
  isMoneyDiagnosis,
  name,
  email,
  privacyConsent,
  marketingConsent,
  submitting,
  saved,
  theme,
  design,
  onEmailChange,
  onPrivacyConsentChange,
  onMarketingConsentChange,
  onSubmit,
}: {
  isMoneyDiagnosis: boolean;
  name: string;
  email: string;
  privacyConsent: boolean;
  marketingConsent: boolean;
  submitting: boolean;
  saved: boolean;
  theme: ThemeColors;
  design: DesignSettings;
  onEmailChange: (value: string) => void;
  onPrivacyConsentChange: (value: boolean) => void;
  onMarketingConsentChange: (value: boolean) => void;
  onSubmit: () => void;
}) {
  const btn = buttonClasses(design.button_style, theme);
  const card = cardClasses(design.card_style, theme);
  return (
    <div
      className={`money-result-card money-funnel-card${isMoneyDiagnosis ? " money-email-result-card" : ""}`}
      style={isMoneyDiagnosis ? {
        ...card,
        marginTop: 16,
        textAlign: "center",
        border: "1px solid #d8c4b7",
        borderRadius: 0,
        backgroundColor: "#f1e7dd",
        boxShadow: "0 18px 42px rgba(96, 72, 59, 0.14)",
      } : { ...card, marginTop: 16, textAlign: "center" }}
    >
      {isMoneyDiagnosis && (
        <div className="money-email-result-icon" style={{ color: theme.accent }} aria-hidden="true">
          <Mail size={25} strokeWidth={1.45} />
        </div>
      )}
      <p className="money-diagnosis-label money-funnel-label" style={{ color: theme.accent }}>
        {isMoneyDiagnosis ? "EMAIL MY RESULT" : "EMAIL RESULT"}
      </p>
      <h2 className="money-funnel-title" style={{ color: theme.text }}>
        {isMoneyDiagnosis ? (
          <>무료 진단 결과를<br />이메일로 받아보세요</>
        ) : "전체 결과 이메일 신청"}
      </h2>
      {isMoneyDiagnosis ? (
        <div className="money-funnel-body" style={{ color: theme.text, opacity: 0.82 }}>
          <p>
            지금 확인한 돈 반응 유형과 신앙 유형 결과를<br />
            이메일로 보내드려요.<br />
            천천히 다시 읽으며 나의 돈 관리 흐름을 돌아보세요.
          </p>
        </div>
      ) : (
        <p
          className="whitespace-pre-line"
          style={{
            marginTop: 12,
            fontSize: 14,
            lineHeight: 1.75,
            color: theme.text,
            opacity: 0.78,
          }}
        >
          이메일을 저장하면 결과 요약을 이메일로 보내드립니다.
        </p>
      )}
      {name && (
        <p className={isMoneyDiagnosis ? "money-email-recipient-guide" : undefined} style={{ marginTop: isMoneyDiagnosis ? 32 : 10, fontSize: isMoneyDiagnosis ? 16 : 13, color: theme.muted }}>
          {isMoneyDiagnosis
            ? `${name}님의 결과를 받을 이메일 주소를 입력해주세요.`
            : `${name}님의 결과를 저장할 이메일을 알려주세요.`}
        </p>
      )}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          data-result-email
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="이메일 주소 입력"
          type="email"
          autoComplete="email"
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.bg,
            color: theme.text,
            fontSize: 14,
            textAlign: "center",
            outline: "none",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: isMoneyDiagnosis ? "stretch" : "center",
          maxWidth: isMoneyDiagnosis ? 460 : undefined,
          marginLeft: isMoneyDiagnosis ? "auto" : undefined,
          marginRight: isMoneyDiagnosis ? "auto" : undefined,
        }}
      >
        <label className="money-email-consent" style={{ color: theme.muted }}>
          <input
            type="checkbox"
            checked={privacyConsent}
            onChange={(e) => onPrivacyConsentChange(e.target.checked)}
            style={{ margin: "3px 0 0" }}
          />
          <strong>필수</strong>
          <span>개인정보 수집 및 이용에 동의합니다.</span>
        </label>
        <label className="money-email-consent" style={{ color: theme.muted }}>
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => onMarketingConsentChange(e.target.checked)}
            style={{ margin: "3px 0 0" }}
          />
          {isMoneyDiagnosis
            ? <><strong>선택</strong><span>돈에 관한 마음과 기준을 정리하는 데 도움이 되는 자료를 가끔 이메일로 받아봅니다.</span></>
            : <><strong>선택</strong><span>셀라 소식과 자료 안내를 이메일로 받아봅니다.</span></>}
        </label>
      </div>
      <button
        className={isMoneyDiagnosis ? "money-email-submit-button" : undefined}
        onClick={onSubmit}
        disabled={submitting || saved || !privacyConsent || !email.trim()}
        style={{
          ...btn,
          width: isMoneyDiagnosis ? "100%" : undefined,
          maxWidth: isMoneyDiagnosis ? 340 : undefined,
          marginTop: isMoneyDiagnosis ? 32 : 18,
          padding: isMoneyDiagnosis ? "14px 22px" : "12px 26px",
          borderRadius: 999,
          fontSize: isMoneyDiagnosis ? 16 : 13,
          fontWeight: isMoneyDiagnosis ? 700 : 500,
          cursor: submitting ? "wait" : "pointer",
          opacity: saved ? 0.82 : 1,
        }}
      >
        {saved
          ? isMoneyDiagnosis ? "결과를 저장했어요. 이메일에서 확인해주세요." : "이메일 정보가 저장되었습니다"
          : isMoneyDiagnosis ? "무료 결과 이메일로 받기" : "이메일 정보 저장하기"}
      </button>
    </div>
  );
}

function MoneyPaidDiagnosisSection({
  theme,
  design,
  moneyTitle,
  faithTitle,
}: {
  theme: ThemeColors;
  design: DesignSettings;
  moneyTitle: string;
  faithTitle: string;
}) {
  const btn = buttonClasses(design.button_style, theme);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const checkoutUrl = (import.meta.env.VITE_SELAH_MONEY_REPORT_CHECKOUT_URL as string | undefined)?.trim();

  useEffect(() => {
    if (!detailsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailsOpen]);

  const purchaseButton = (placement: string) => checkoutUrl ? (
    <a
      className="money-report-purchase-button"
      href={checkoutUrl}
      data-placement={placement}
      style={{ ...btn }}
    >
      9,900원으로 내 심층 리포트 받기
      <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
    </a>
  ) : (
    <button
      className="money-report-purchase-button money-report-purchase-button-pending"
      type="button"
      data-placement={placement}
      onClick={() => toast.info("결제 링크를 연결하고 있습니다.")}
      style={{ ...btn }}
    >
      9,900원으로 내 심층 리포트 받기
      <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );

  return (
    <section className="money-funnel-section money-paid-funnel-section">
      <div className="money-paid-teaser">
        <p className="money-paid-teaser-kicker">무료 결과 다음 이야기</p>
        <div className="money-paid-bridge-icon" aria-hidden="true"><Fingerprint size={29} strokeWidth={1.35} /></div>
        <p className="money-paid-teaser-copy">
          여기까지는 돈 반응과 신앙 유형을<br />각각 살펴봤어요.
        </p>
        <h2>내 두 결과가 만나면<br />어떤 흐름이 만들어질까요?</h2>
        <p className="money-paid-teaser-detail">
          실제 소비·저축·투자에서는 두 반응이 따로 움직이지 않습니다. 두 결과의 연결을 이해하면 반복되는 선택의 이유가 더 선명해집니다.
        </p>
        <button className="money-paid-preview-button" type="button" onClick={() => setDetailsOpen(true)} style={{ ...btn }}>
          내 심층 리포트 미리보기
          <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <p className="money-paid-teaser-meta">11페이지 개인 맞춤 PDF · 구매 후 24시간 이내 이메일 전송</p>
      </div>

      {detailsOpen && (
        <div className="money-report-offer-overlay" role="dialog" aria-modal="true" aria-label="셀라 머니 심층 리포트 미리보기">
          <div className="money-report-offer-page">
            <button className="money-report-offer-close" type="button" onClick={() => setDetailsOpen(false)} aria-label="미리보기 닫기">
              <X size={22} />
            </button>

            <header className="money-report-offer-hero">
              <p>SELAH MONEY PERSONAL REPORT</p>
              <h2>돈 반응과 신앙 유형을 연결하면<br />반복되는 선택의 이유가 선명해집니다.</h2>
              <div className="money-report-type-combination">
                <span>{moneyTitle}</span><strong>×</strong><span>{faithTitle}</span>
              </div>
              <p className="money-report-offer-lead">나의 두 결과로 완성되는 11페이지 개인 맞춤 리포트</p>
              {purchaseButton("hero")}
              <small>결제하신 진단 결과를 바탕으로 제작해 24시간 이내 이메일로 보내드립니다.</small>
            </header>

            <section className="money-report-sample-section">
              <p className="money-report-section-kicker">REPORT PREVIEW</p>
              <h3>실제 리포트에는<br />이런 내용이 담겨요</h3>
              <div className="money-report-sample-pages" aria-label="실제 리포트 페이지 미리보기">
                <article>
                  <div className="money-report-page-image">
                    <img src="/selah-money-report-preview/page-01-cover.png" alt="개인 이름과 돈 유형, 신앙 유형이 담긴 실제 리포트 표지 예시" loading="lazy" />
                  </div>
                  <div className="money-report-sample-copy"><span>01 · 개인 맞춤 표지</span><h4>나의 두 유형으로 시작해요</h4><p>이름과 돈 반응, 신앙 반응을 반영한 개인 리포트로 제작됩니다.</p></div>
                </article>
                <article>
                  <div className="money-report-page-image money-report-page-image--locked">
                    <img src="/selah-money-report-preview/page-06-integration.png" alt="돈 반응과 신앙 반응을 연결한 실제 리포트 페이지 예시" loading="lazy" />
                    <div className="money-report-page-lock">개인별 연결 해석은<br />구매 후 확인할 수 있어요</div>
                  </div>
                  <div className="money-report-sample-copy"><span>06 · 통합 해석</span><h4>두 마음이 함께 만드는 돈 선택</h4><p>돈 반응과 신앙 반응이 실제 선택 안에서 어떻게 함께 움직이는지 살펴봅니다.</p></div>
                </article>
                <article>
                  <div className="money-report-page-image">
                    <img src="/selah-money-report-preview/page-08-direction.png" alt="앞으로 세워갈 돈과 삶의 방향을 제안하는 실제 리포트 페이지 예시" loading="lazy" />
                  </div>
                  <div className="money-report-sample-copy"><span>08 · 행동 방향</span><h4>앞으로 세워갈 돈과 삶의 방향</h4><p>오늘부터 적용할 수 있는 세 가지 기준과 실천 방향을 제안합니다.</p></div>
                </article>
                <article>
                  <div className="money-report-page-image money-report-page-image--summary">
                    <img src="/selah-money-report-preview/page-10-summary.png" alt="핵심 해석과 기억할 방향을 정리한 실제 리포트 페이지 예시" loading="lazy" />
                  </div>
                  <div className="money-report-sample-copy"><span>10 · 전체 정리</span><h4>나의 결과를 한눈에 정리해요</h4><p>11페이지의 핵심 해석과 앞으로 기억할 방향을 한 장으로 다시 확인합니다.</p></div>
                </article>
              </div>
              {purchaseButton("after-samples")}
            </section>

            <section className="money-report-difference-section">
              <div>
                <span>무료 진단</span>
                <h3>나에게 어떤 반응이 나타나는지 발견합니다.</h3>
              </div>
              <ArrowRight size={24} aria-hidden="true" />
              <div>
                <span>심층 리포트</span>
                <h3>왜 함께 나타나는지 이해하고, 무엇부터 바꿀지 확인합니다.</h3>
              </div>
            </section>

            <section className="money-report-inclusions-section">
              <p className="money-report-section-kicker">11-PAGE PERSONAL REPORT</p>
              <h3>막연한 다짐 대신<br />내 마음을 이해한 뒤 세우는 돈의 기준</h3>
              <ul>
                <li><Check size={18} /><span>돈 앞에서 반복되는 나의 반응과 일상 속 모습</span></li>
                <li><Check size={18} /><span>돈을 대할 때 나타나는 신앙 반응</span></li>
                <li><Check size={18} /><span>돈 반응과 신앙 반응이 함께 만드는 선택</span></li>
                <li><Check size={18} /><span>이 조합이 가진 강점과 살펴볼 방향</span></li>
                <li><Check size={18} /><span>앞으로 세워갈 돈과 삶의 세 가지 방향</span></li>
                <li><Check size={18} /><span>말씀 묵상과 나의 결과 전체 정리</span></li>
              </ul>
            </section>

            <footer className="money-report-offer-footer">
              <p>LAUNCH PRICE</p>
              <strong>9,900원</strong>
              <span>런칭 종료 후 12,000원</span>
              {purchaseButton("footer")}
              <small>개인 맞춤 11페이지 PDF · 구매 후 24시간 이내 이메일 전송</small>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}


function FunnelCtas({
  theme,
  design,
  isMoneyDiagnosis,
}: {
  theme: ThemeColors;
  design: DesignSettings;
  isMoneyDiagnosis: boolean;
}) {
  const btn = buttonClasses(design.button_style, theme);
  const card = cardClasses(design.card_style, theme);
  if (isMoneyDiagnosis) {
    return (
      <section className="money-content-footer" style={{ color: theme.text }}>
        <h2>
          셀라의 이야기를 계속 만나보세요
        </h2>
        <div className="money-content-footer-links">
          <a href="https://www.youtube.com/@selahinsight" target="_blank" rel="noreferrer">
            <Youtube size={19} strokeWidth={1.5} aria-hidden="true" />
            YouTube
          </a>
          <a href="https://www.instagram.com/selah.insight/" target="_blank" rel="noreferrer">
            <Instagram size={19} strokeWidth={1.5} aria-hidden="true" />
            Instagram
          </a>
        </div>
      </section>
    );
  }
  const links = [
    { label: "셀라 머니 진단 리포트 보기", href: "#" },
    { label: "셀라 머니 라운지 입장하기", href: "#" },
    { label: "셀라 유튜브에서 더 알아보기", href: "#" },
    { label: "셀라 인스타그램에서 팁 받아보기", href: "#" },
  ];
  return (
    <div style={{ ...card, marginTop: 16, borderRadius: 24, padding: 28, textAlign: "center" }}>
      <p style={{ fontSize: 12, letterSpacing: "0.18em", color: theme.accent }}>NEXT STEP</p>
      <h2 style={{ marginTop: 10, fontSize: 24, lineHeight: 1.35, color: theme.text }}>
        셀라와 함께 이어가기
      </h2>
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            style={{
              ...btn,
              width: "100%",
              maxWidth: 320,
              padding: "12px 20px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function Wrap({
  children,
  theme,
  design,
  introMode = false,
}: {
  children: React.ReactNode;
  theme: ThemeColors;
  design: DesignSettings;
  introMode?: boolean;
}) {
  return (
    <div
      className={introMode ? "money-intro-wrap" : undefined}
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: fontFamilyOf(design.font_mood),
        padding: "40px 20px",
      }}
    >
      <div className={introMode ? "money-mobile-frame" : undefined} style={{ maxWidth: 560, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

function ResultActions({
  survey,
  result,
  design,
  theme,
}: {
  survey: Survey;
  result: ResultType;
  design: DesignSettings;
  theme: ThemeColors;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/s/${survey.slug}`;
    QRCode.toDataURL(url, { margin: 1, width: 320 })
      .then((d) => setQrDataUrl(d))
      .catch(() => undefined);
  }, [survey.slug]);


  async function handleDownload() {
    if (!cardRef.current) return;
    try {
      setBusy(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: 1080,
        height: 1350,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `selah-result-${result.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("결과 카드를 저장했어요.");
    } catch (e) {
      console.error(e);
      toast.error("저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  const btn = buttonClasses(design.button_style, theme);

  return (
    <>
      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 10,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleDownload}
          disabled={busy}
          style={{
            ...btn,
            padding: "12px 22px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            cursor: busy ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Download size={14} /> 이미지로 저장
        </button>
      </div>

      {/* Off-screen capture source */}
      <div
        style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}
        aria-hidden
      >
        <ResultDiagnosisCard ref={cardRef} survey={survey} result={result} design={design} qrDataUrl={qrDataUrl} />
      </div>
    </>
  );
}

