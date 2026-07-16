import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/s/$slug")({
  component: RespondentSurvey,
});

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

function RespondentSurvey() {
  const { slug } = Route.useParams();
  const [survey, setSurvey] = useState<Survey | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function loadPublishedStudioSurvey(): Promise<Survey | null> {
      if (slug !== "selah-money-diagnosis") return null;

      // Selah Studio의 반영 완료 버전을 공개 설문의 단일 기준 데이터로 사용합니다.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("studio_surveys")
        .select("*")
        .eq("slug", slug)
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
        questions: Array.isArray(content.questions) ? content.questions : [],
        resultTypes: Array.isArray(content.results) ? content.results : [],
        status: "published",
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        deletedAt: null,
        responses: [],
        design_settings: data.theme || undefined,
      } as Survey;
    }

    async function loadFallbackSurvey(): Promise<Survey | null> {
      if (slug !== "selah-money-diagnosis") return null;

      const response = await fetch("/selah-money-diagnosis-survey-json.txt");
      if (!response.ok) return null;

      const fallback = (await response.json()) as Survey;
      return {
        ...fallback,
        id: fallback.id || "selah-money-diagnosis",
        slug: fallback.slug || "selah-money-diagnosis",
        status: "published",
        responses: fallback.responses ?? [],
        createdAt: fallback.createdAt ?? Date.now(),
      };
    }

    async function load() {
      if (slug === "selah-money-diagnosis") {
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
  }, [slug]);

  if (survey === undefined) {
    if (slug === "selah-money-diagnosis") {
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
  secondaryMoneyType?: ResultType;
  faithLenses: ResultType[];
  primaryFaithLens?: ResultType;
  scores: Record<string, { total: number; average: number }>;
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
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [starting, setStarting] = useState(false);
  const [customerContact, setCustomerContact] = useState<
    { id: string; contactToken: string } | null
  >(null);
  const lastPickRef = useRef<{ qid: string; resultType: string } | null>(null);

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

  async function startSurvey() {
    if (starting) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("이름 또는 닉네임을 입력해주세요.");
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
  }

  async function submitEmailRequest() {
    if (submitting) return;
    const trimmedEmail = email.trim();
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
      const studioRes = await sendStudioIntake({
        data: {
          email: trimmedEmail,
          name: name.trim() || undefined,
          responseId: responseId ?? uid("r"),
          surveyId: survey.id || survey.slug,
          surveySlug: survey.slug,
          surveyTitle: survey.title,
          answers: answersForStudio(survey, answers),
          resultTypeId: result?.id,
          primaryMoneyTypeId: selahResult?.primaryMoneyType?.id,
          secondaryMoneyTypeId: selahResult?.secondaryMoneyType?.id,
          primaryFaithLensId: selahResult?.primaryFaithLens?.id,
          privacyConsent: true,
          marketingConsent,
        },
      });

      if (studioRes.status !== "sent") {
        console.warn("[selah] Selah Studio intake was not completed", studioRes);
        toast.error("결과 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      setEmailSaved(true);
      toast.success("결과가 저장되었습니다.");
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
    const scoreByQuestionIndex = (index: number) => {
      const question = currentSurvey.questions[index - 1];
      const answer = question ? currentAnswers[question.id] : undefined;
      const value = Array.isArray(answer) ? answer[0] : answer;
      return scoreForStudio(question, value) ?? 0;
    };
    const groups: Record<string, number[]> = {
      organizing_delay: [1, 5, 9, 13, 17],
      safety_seeking: [2, 6, 10, 14, 18],
      gaze_sensitive: [3, 7, 11, 15, 19],
      emotional_reward: [4, 8, 12, 16, 20],
      faith_burden: [21, 23, 25, 27, 29],
      faith_separation: [22, 24, 26, 28, 30],
    };
    const scores = Object.fromEntries(
      Object.entries(groups).map(([id, indexes]) => {
        const totalScore = indexes.reduce((sum, idx) => sum + scoreByQuestionIndex(idx), 0);
        return [id, { total: totalScore, average: totalScore / indexes.length }];
      }),
    ) as SelahMoneyResult["scores"];
    const byId = (id: string) => currentSurvey.resultTypes?.find((rt) => rt.id === id);
    const moneyTypeIds = ["organizing_delay", "safety_seeking", "gaze_sensitive", "emotional_reward"];
    const rankedMoney = [...moneyTypeIds].sort((a, b) => scores[b].average - scores[a].average);
    const first = rankedMoney[0];
    const second = rankedMoney[1];
    const primaryMoneyType = scores[first].average >= 2.6 ? byId(first) : undefined;
    const secondaryMoneyType =
      primaryMoneyType &&
      scores[second].average >= 2.6 &&
      scores[first].average - scores[second].average <= 0.4
        ? byId(second)
        : undefined;
    const faithIds = ["faith_burden", "faith_separation"];
    const faithLenses = faithIds
      .filter((id) => scores[id].average >= 2.6)
      .sort((a, b) => scores[b].average - scores[a].average)
      .map((id) => byId(id))
      .filter((rt): rt is ResultType => Boolean(rt));
    return {
      primaryMoneyType,
      secondaryMoneyType,
      faithLenses,
      primaryFaithLens: faithLenses[0],
      scores,
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
                <span className="money-intro-line">나는 돈을</span>{" "}
                <span className="money-intro-line">어떻게 다루고 있을까요?</span>
              </>
            ) : survey.title}
          </h1>

          {isMoneyDiagnosis ? (
            <>
              <p
                className="money-intro-description money-intro-lead"
                style={{ margin: "24px auto 0", maxWidth: 540, fontSize: 16, lineHeight: 1.8, color: theme.text, opacity: 0.78 }}
              >
                <span className="money-intro-line">내가 돈을 다루는 방식에는</span>{" "}
                <span className="money-intro-line">나도 미처 알지 못했던 마음과 기준이</span>{" "}
                <span className="money-intro-line">숨어 있습니다.</span>
              </p>
              <p
                className="money-intro-description"
                style={{ margin: "16px auto 0", maxWidth: 540, fontSize: 16, lineHeight: 1.8, color: theme.text, opacity: 0.78 }}
              >
                <span className="money-intro-line">진단지를 통해</span>{" "}
                <span className="money-intro-line">나도 몰랐던 마음과 기준을 발견하고,</span>{" "}
                <span className="money-intro-line">돈을 더 평안하게 다루기 위한</span>{" "}
                <span className="money-intro-line">출발점을 찾아 보세요.</span>
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
          <div className={isMoneyDiagnosis ? "money-name-field" : undefined} style={{ marginTop: 24, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
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
              이름 또는 닉네임
            </label>
            <input
              id="respondent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isMoneyDiagnosis ? "예: 김다윗 / 하나님의 자녀" : "예: 지혜 / 회복중인 사람"}
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
          <button
            className={isMoneyDiagnosis ? "money-start-button" : undefined}
            onClick={() => {
              void startSurvey();
            }}
            disabled={starting || !name.trim()}
            style={{
              ...btnPrimary,
              marginTop: 24,
              padding: "13px 34px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: starting ? "wait" : "pointer",
              opacity: !name.trim() ? 0.5 : 1,
            }}
          >
            {starting ? "준비 중..." : isMoneyDiagnosis ? "진단 시작하기" : "시작하기"}
          </button>
          {isMoneyDiagnosis && (
            <p className="money-duration" style={{ marginTop: 12, fontSize: 13, color: theme.muted, textAlign: "center" }}>
              총 30문항 · 약 3~4분 소요
            </p>
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
            padding: "42px 36px 34px",
            textAlign: "center",
            border: `1px solid ${theme.border}`,
          }}
        >
          <p className="money-prep-intro" style={{ fontSize: 14, lineHeight: 1.8, color: theme.text, fontWeight: 400 }}>
            더 정확한 결과를 위해
          </p>
          <p className="money-prep-subtitle" style={{ marginTop: 22, fontSize: 22, lineHeight: 1.6, color: theme.text, fontWeight: 700 }}>
            <span className="money-prep-line">이 진단지는</span>{" "}
            <span className="money-prep-line">가볍게 유형만 나누는 테스트가 아닙니다</span>
          </p>
          <p className="money-prep-research" style={{ marginTop: 18, fontSize: 14, lineHeight: 1.9, color: theme.text, opacity: 0.78 }}>
            <span className="money-prep-line">돈에 대한 태도를 분석한 국내외 연구와</span>
            <span className="money-prep-line">크리스천의 돈, 신앙 인식을 다룬</span>
            <span className="money-prep-line">통계자료를 바탕으로</span>
            <span className="money-prep-line">셀라가 구성한 연구 기반 점검지입니다</span>
          </p>
          <h2 className="money-prep-reminder" style={{ marginTop: 28, fontSize: 17, lineHeight: 1.5, color: theme.text, fontWeight: 600 }}>
            답할 때 꼭 기억해주세요
          </h2>
          <p className="money-prep-period" style={{ marginTop: 4, fontSize: 15, lineHeight: 1.8, color: theme.text, opacity: 0.84 }}>
            최근 3개월 동안의 나를 떠올려주세요.
          </p>
          <p className="money-prep-final" style={{ marginTop: 20, fontSize: 19, lineHeight: 1.7, color: theme.text, fontWeight: 700 }}>
            <span className="money-prep-line">솔직하게 답할수록</span>{" "}
            <span className="money-prep-line">더 정확한 나의 마음을 알 수 있습니다.</span>
          </p>
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
            준비됐어요, 시작할게요
          </button>
        </div>
      </Wrap>
    );
  }


  if (phase === "done") {
    if (result) {
      return (
        <Wrap theme={theme} design={design}>
          <div
            style={{
              ...cardStyle,
              borderRadius: 8,
              padding: 36,
              border: `1px solid ${theme.border}`,
            }}
          >
            <p style={{ fontSize: 12, letterSpacing: "0.25em", color: theme.accent, textAlign: "center" }}>
              SELAH MONEY DIAGNOSIS
            </p>
            <p style={{ marginTop: 14, fontSize: 13, color: theme.muted, textAlign: "center" }}>
              {survey.title}
            </p>
            <h1
              style={{
                marginTop: 8,
                fontSize: 32,
                lineHeight: 1.3,
                color: theme.text,
                textAlign: "center",
                fontFamily: headingFont,
              }}
            >
              셀라 머니 진단이 완료되었어요.
            </h1>

            <ResultSectionTitle theme={theme}>나의 주된 돈 반응 유형</ResultSectionTitle>
            <h2 style={{ marginTop: 10, fontSize: 26, lineHeight: 1.35, color: theme.text, textAlign: "center", fontFamily: headingFont }}>
              {result.title}
            </h2>
            {selahResult?.secondaryMoneyType && (
              <p style={{ marginTop: 8, fontSize: 13, color: theme.muted, textAlign: "center" }}>
                함께 나타나는 유형: {selahResult.secondaryMoneyType.title}
              </p>
            )}
            {result.representative_sentence && (
              <p style={{ marginTop: 14, fontSize: 15, color: theme.accent, textAlign: "center", fontStyle: "italic" }}>
                {result.representative_sentence}
              </p>
            )}
            {result.summary && (
              <p style={{ marginTop: 20, fontSize: 15, lineHeight: 1.65, color: theme.text, opacity: 0.85, textAlign: "center" }}>
                {result.summary}
              </p>
            )}
            {result.description && (
              <p className="whitespace-pre-line" style={{ marginTop: 18, fontSize: 14, lineHeight: 1.75, color: theme.text, opacity: 0.8 }}>
                {result.description}
              </p>
            )}
            {result.interpretation && (
              <div style={{ marginTop: 22, padding: 18, borderRadius: 8, backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                <p style={{ fontSize: 12, color: theme.accent, fontWeight: 500, marginBottom: 8 }}>이 유형의 흐름</p>
                <p className="whitespace-pre-line" style={{ fontSize: 14, lineHeight: 1.7, color: theme.text, opacity: 0.82 }}>
                  {result.interpretation}
                </p>
              </div>
            )}
            {result.flow && (
              <div style={{ marginTop: 16, padding: 18, borderRadius: 8, backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                <p style={{ fontSize: 12, color: theme.accent, fontWeight: 500, marginBottom: 8, textAlign: "center" }}>반복되는 마음의 흐름</p>
                <p className="whitespace-pre-line" style={{ fontSize: 14, lineHeight: 1.7, color: theme.text, opacity: 0.82 }}>
                  {result.flow}
                </p>
              </div>
            )}
            {selahResult && (
              <div style={{ marginTop: 16, padding: 18, borderRadius: 8, backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                <p style={{ fontSize: 12, color: theme.accent, fontWeight: 500, marginBottom: 8, textAlign: "center" }}>
                  돈과 신앙 사이에서 나타나는 렌즈
                </p>
                {selahResult.faithLenses.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {selahResult.faithLenses.map((lens) => (
                      <div key={lens.id}>
                        <p style={{ fontSize: 15, color: theme.text, textAlign: "center", fontWeight: 500 }}>
                          {lens.title}
                        </p>
                        {lens.description && (
                          <p className="whitespace-pre-line" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.7, color: theme.text, opacity: 0.82 }}>
                            {lens.description}
                          </p>
                        )}
                        {lens.interpretation && (
                          <p className="whitespace-pre-line" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.7, color: theme.text, opacity: 0.82 }}>
                            {lens.interpretation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: theme.text, opacity: 0.82, textAlign: "center" }}>
                    현재 답변에서는 돈을 지나친 부담감으로 해석하거나 신앙과 현실을 크게 분리하는 흐름이 두드러지지 않았어요.
                  </p>
                )}
              </div>
            )}
            {result.small_action && (
              <div style={{ marginTop: 16, padding: 18, borderRadius: 8, backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                <p style={{ fontSize: 12, color: theme.accent, fontWeight: 500, marginBottom: 8, textAlign: "center" }}>이번 주 작은 실천</p>
                <p className="whitespace-pre-line" style={{ fontSize: 14, lineHeight: 1.7, color: theme.text, opacity: 0.82 }}>
                  {result.small_action}
                </p>
              </div>
            )}
            {(result.bibleVerse || (survey.audience_type === "christian" && survey.bible_verse)) && (
              <div
                style={{
                  marginTop: 24,
                  padding: 16,
                  borderRadius: 8,
                  backgroundColor: theme.bg,
                  borderLeft: `3px solid ${theme.accent}`,
                  fontStyle: "italic",
                  color: theme.text,
                  fontSize: 14,
                }}
              >
                {result.bibleVerse ?? survey.bible_verse}
              </div>
            )}
            {survey.completion_message && (
              <p className="whitespace-pre-line" style={{ marginTop: 22, fontSize: 13, color: theme.muted, textAlign: "center" }}>
                {survey.completion_message}
              </p>
            )}
          </div>

          <EmailResultSection
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
              void submitEmailRequest();
            }}
          />

          <FunnelCtas theme={theme} design={design} />
          <ResultActions survey={survey} result={result} design={design} theme={theme} />
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

      <div style={{ ...cardStyle, borderRadius: 8, padding: "34px 30px", border: `1px solid ${theme.border}` }}>
        <p style={{ marginBottom: 14, fontSize: 11, letterSpacing: "0.18em", color: theme.accent, textAlign: "center" }}>
          SELAH MONEY CHECK
        </p>
        <h2 style={{ fontSize: 25, lineHeight: 1.55, color: theme.text, fontFamily: headingFont, textAlign: "center", fontWeight: 500 }}>{q.text}</h2>

        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 12 }}>
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
                    onClick={() => setAnswers({ ...answers, [q.id]: n })}
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
                    fontSize: 15,
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
          onClick={() => setI(Math.max(0, i - 1))}
          disabled={i === 0}
          style={{
            fontSize: 14,
            color: theme.muted,
            background: "none",
            border: "none",
            cursor: i === 0 ? "default" : "pointer",
            opacity: i === 0 ? 0.4 : 1,
          }}
        >
          이전
        </button>
        <button
          onClick={next}
          style={{
            ...btnPrimary,
            padding: "12px 32px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
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
      style={{
        marginTop: 24,
        fontSize: 12,
        color: theme.accent,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textAlign: "center",
      }}
    >
      {children}
    </p>
  );
}

function EmailResultSection({
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
    <div style={{ ...card, marginTop: 16, borderRadius: 24, padding: 28, textAlign: "center" }}>
      <p style={{ fontSize: 12, letterSpacing: "0.18em", color: theme.accent }}>EMAIL RESULT</p>
      <h2 style={{ marginTop: 10, fontSize: 24, lineHeight: 1.35, color: theme.text }}>
        전체 결과 이메일 신청
      </h2>
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
        이메일을 저장하면 결과 요약을 이메일로 보내드립니다.{"\n"}메일 발송 기능이 준비되는 동안에는 결과 저장만 먼저 진행합니다.
      </p>
      {name && (
        <p style={{ marginTop: 10, fontSize: 13, color: theme.muted }}>
          {name}님의 결과를 저장할 이메일을 알려주세요.
        </p>
      )}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="이메일"
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
          alignItems: "center",
        }}
      >
        <label style={{ fontSize: 12, color: theme.muted }}>
          <input
            type="checkbox"
            checked={privacyConsent}
            onChange={(e) => onPrivacyConsentChange(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          (필수) 개인정보 수집 및 이용에 동의합니다.
        </label>
        <label style={{ fontSize: 12, color: theme.muted }}>
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => onMarketingConsentChange(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          (선택) 셀라 소식과 자료 안내를 이메일로 받아봅니다.
        </label>
      </div>
      <button
        onClick={onSubmit}
        disabled={submitting || saved || !privacyConsent || !email.trim()}
        style={{
          ...btn,
          marginTop: 18,
          padding: "12px 26px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 500,
          cursor: submitting ? "wait" : "pointer",
          opacity: saved ? 0.75 : !privacyConsent || !email.trim() ? 0.5 : 1,
        }}
      >
        {saved ? "이메일 정보가 저장되었습니다" : "이메일 정보 저장하기"}
      </button>
    </div>
  );
}


function FunnelCtas({ theme, design }: { theme: ThemeColors; design: DesignSettings }) {
  const btn = buttonClasses(design.button_style, theme);
  const card = cardClasses(design.card_style, theme);
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
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
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

