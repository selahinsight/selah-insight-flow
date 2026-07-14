import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import {
  addResponse,
  computeResultType,
  createCustomerContact,
  getSurveyBySlug,
  optionResultType,
  optionText,
  surveyFromParsed,
  uid,
  updateCustomerContact,
  validateSurveyJson,
  type ResultType,
  type Survey,
} from "@/lib/survey-store";


import { useSurveys } from "@/lib/use-surveys";


import selahLogo from "@/assets/selah-insight-logo.png.asset.json";
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

function RespondentSurvey() {
  const { slug } = Route.useParams();
  useSurveys(); // hydrate
  const isSelahMoneyDiagnosis = slug === "selah-money-diagnosis";
  const [fallbackSurvey, setFallbackSurvey] = useState<Survey | null | undefined>(undefined);
  const survey =
    typeof window !== "undefined" ? getSurveyBySlug(slug) ?? fallbackSurvey : fallbackSurvey;

  useEffect(() => {
    let cancelled = false;
    async function loadFallback() {
      if (typeof window === "undefined") return;
      if (getSurveyBySlug(slug)) {
        setFallbackSurvey(undefined);
        return;
      }
      if (!isSelahMoneyDiagnosis) {
        setFallbackSurvey(null);
        return;
      }
      try {
        const res = await fetch("/selah-money-diagnosis-survey-json.txt", { cache: "no-store" });
        if (!res.ok) throw new Error("fallback survey json not found");
        const raw = await res.text();
        const parsed = validateSurveyJson(raw);
        if (!parsed.ok || !parsed.data) throw new Error(parsed.errors.join("\n"));
        const seeded = surveyFromParsed(parsed.data, raw);
        seeded.slug = slug;
        seeded.status = "published";
        // Public route: render fallback in-memory only. We intentionally do
        // NOT seed the survey into the database from this anonymous path —
        // survey publishing is an admin-only action (see /admin).
        if (!cancelled) setFallbackSurvey(seeded);

      } catch (error) {
        console.error(error);
        if (!cancelled) setFallbackSurvey(null);
      }
    }

    setFallbackSurvey(undefined);
    void loadFallback();
    return () => {
      cancelled = true;
    };
  }, [isSelahMoneyDiagnosis, slug]);

  if (!survey && isSelahMoneyDiagnosis && fallbackSurvey !== null) {
    return (
      <Wrap theme={THEMES[DEFAULT_DESIGN.theme]} design={DEFAULT_DESIGN}>
        <p style={{ fontSize: 24 }}>설문을 불러오는 중입니다.</p>
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>
          잠시만 기다려주세요.
        </p>
      </Wrap>
    );
  }

  if (!survey) {
    return (
      <Wrap theme={THEMES[DEFAULT_DESIGN.theme]} design={DEFAULT_DESIGN}>
        <p style={{ fontSize: 24 }}>설문을 찾을 수 없습니다.</p>
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>
          링크가 만료되었거나 비공개로 전환되었을 수 있습니다.
        </p>
      </Wrap>
    );
  }
  const design = survey.design_settings ?? DEFAULT_DESIGN;
  const theme = THEMES[design.theme];

  if (survey.status !== "published") {
    return (
      <Wrap theme={theme} design={design}>
        <p style={{ fontSize: 24 }}>
          {survey.status === "closed"
            ? "이 설문은 종료되었습니다."
            : "이 설문은 아직 공개되지 않았습니다."}
        </p>
      </Wrap>
    );
  }

  return <Runner survey={survey} design={design} theme={theme} />;
}

type Phase = "intro" | "questions" | "done";

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
      // Create a customer record now (no email yet). Only name/nickname.
      const contact = await createCustomerContact({ name: trimmedName });
      if (!contact) {
        toast.error("시작에 실패했어요. 다시 시도해주세요.");
        return;
      }
      setCustomerContact({ id: contact.id, contactToken: contact.contact_token });
      setPhase("questions");
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
    void addResponse({
      id,
      surveyId: survey.id,
      submittedAt: Date.now(),
      answers,
      resultTypeId: rt?.id,
      inLounge: false,
      customerId: customerContact?.id,
      customerName: name.trim() || undefined,
    });
    setResponseId(id);
    setResult(rt);
    setSelahResult(selah);
    setPhase("done");
  }

  async function submitEmailRequest() {
    if (submitting) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/.+@.+\..+/.test(trimmedEmail)) {
      toast.error("이메일을 정확히 입력해주세요.");
      return;
    }
    if (!privacyConsent) {
      toast.error("개인정보 수집 이용에 동의해주세요.");
      return;
    }
    if (!customerContact) {
      toast.error("세션 정보가 없어 저장할 수 없어요. 처음부터 다시 시도해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const ok = await updateCustomerContact({
        customerId: customerContact.id,
        contactToken: customerContact.contactToken,
        email: trimmedEmail,
        marketingConsent,
        privacyConsent: true,
      });
      if (!ok) {
        toast.error("이메일 저장에 실패했어요. 다시 시도해주세요.");
        return;
      }
      // Contact info now lives on the customer row (updated via the
      // update_customer_contact RPC above). We intentionally do not mirror
      // name/email onto survey_responses from the public route — that write
      // path is admin-only.

      setEmailSaved(true);
      toast.success("전체 결과를 이메일로 받을 정보가 저장되었어요.");
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
      if (typeof value === "number") return value;
      if (typeof value !== "string") return 0;
      if (value.includes("거의 그렇지")) return 1;
      if (value.includes("가끔")) return 2;
      if (value.includes("자주")) return 3;
      if (value.includes("거의 늘")) return 4;
      return 0;
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
  const [introSubtitle, ...introBodyParts] = (survey.description ?? "").split(/\n\n+/);
  const introBody = introBodyParts.join("\n\n");


  if (phase === "intro") {
    return (
      <Wrap theme={theme} design={design}>
        <div
          style={{
            ...cardStyle,
            borderRadius: 8,
            padding: "48px 42px 40px",
            textAlign: "center",
            border: `1px solid ${theme.border}`,
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              color: theme.accent,
              textTransform: "uppercase",
            }}
          >
            SELAH MONEY DIAGNOSIS
          </p>
          <h1
            style={{
              marginTop: 18,
              fontSize: 42,
              lineHeight: 1.18,
              color: theme.text,
              fontFamily: headingFont,
              fontWeight: 500,
            }}
          >
            {survey.title}
          </h1>

          {introSubtitle && (
            <p
              style={{
                margin: "16px auto 0",
                maxWidth: 480,
                fontSize: 17,
                lineHeight: 1.7,
                color: theme.text,
                opacity: 0.86,
              }}
            >
              {introSubtitle}
            </p>
          )}

          {introBody && (
            <p
              className="whitespace-pre-line"
              style={{
                margin: "26px auto 0",
                maxWidth: 500,
                fontSize: 15,
                lineHeight: 1.9,
                color: theme.text,
                opacity: 0.72,
              }}
            >
              {introBody}
            </p>
          )}
          <p style={{ marginTop: 22, fontSize: 13, color: theme.muted }}>
            {survey.estimated_time}
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
              “{survey.bible_verse}”
            </div>
          )}
          <p style={{ marginTop: 28, fontSize: 14, color: theme.text, opacity: 0.75 }}>
            정답은 없습니다. 지금의 상태와 가장 가까운 답을 선택해주세요.
          </p>
          <div style={{ marginTop: 24, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
            <label
              htmlFor="respondent-name"
              style={{
                display: "block",
                fontSize: 12,
                letterSpacing: "0.14em",
                color: theme.muted,
                marginBottom: 8,
                textAlign: "left",
                textTransform: "uppercase",
              }}
            >
              이름 또는 닉네임
            </label>
            <input
              id="respondent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 지영 / 회복중인 사람"
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
            <p style={{ marginTop: 8, fontSize: 12, color: theme.muted, textAlign: "center" }}>
              이메일은 진단이 끝난 뒤에만 선택적으로 받습니다.
            </p>
          </div>
          <button
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
            {starting ? "준비 중..." : "시작하기"}
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
                “{result.representative_sentence}”
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
                <p style={{ fontSize: 12, color: theme.accent, fontWeight: 500, marginBottom: 8 }}>이 유형의 의미</p>
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
                    현재 돈에 대한 선택을 지나치게 죄책감으로 해석하거나, 신앙과 현실을 크게 분리하는 특징은 두드러지지 않아요.
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
                “{result.bibleVerse ?? survey.bible_verse}”
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
              “{survey.bible_verse}”
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
          {i === total - 1 ? "다음" : "다음"}
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
      toast.success("결과 카드를 저장했어요");
    } catch (e) {
      toast.error("저장에 실패했어요");
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
      const text = "나의 Selah 진단 결과를 확인했어요. 당신도 한번 해보세요.";
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
        toast.info("이 브라우저에서는 공유 대신 저장했어요");
      }
    } catch (e) {
      // Cancelled share isn't a real error
      const err = e as Error;
      if (err.name !== "AbortError") {
        toast.error("공유에 실패했어요");
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
          내 진단 결과를 저장하거나 공유해보세요.
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
        전체 결과를 이메일로 받아보세요
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
        지금 화면에서는 가장 두드러지는 결과를 먼저 보여드렸어요.{"\n"}이메일로는 내 돈 반응이 실제 생활에서 어떻게 나타나는지, 어떤 말씀과 기준으로 정리하면 좋을지 더 자세히 보내드립니다.
      </p>
      {name && (
        <p style={{ marginTop: 10, fontSize: 13, color: theme.muted }}>
          {name}님에게 결과를 보내드릴 이메일을 알려주세요.
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
          (필수) 개인정보 수집·이용에 동의합니다
        </label>
        <label style={{ fontSize: 12, color: theme.muted }}>
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => onMarketingConsentChange(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          (선택) 셀라 소식과 자료 안내를 이메일로 받아봅니다
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
        {saved ? "이메일 신청 정보가 저장되었어요" : "내 전체 결과 이메일로 받기"}
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
    { label: "셀라 인스타그램에서 더 받아보기", href: "#" },
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
}: {
  children: React.ReactNode;
  theme: ThemeColors;
  design: DesignSettings;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: fontFamilyOf(design.font_mood),
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <img src={selahLogo.url} alt="Selah Insight" style={{ height: 28, width: "auto" }} />
        </div>
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
      toast.success("결과 카드를 저장했어요");
    } catch (e) {
      console.error(e);
      toast.error("저장에 실패했어요");
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

