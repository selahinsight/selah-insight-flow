import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import {
  addResponse,
  computeResultType,
  getSurveyBySlug,
  optionResultType,
  optionText,
  uid,
  type ResultType,
  type Survey,
} from "@/lib/survey-store";
import { useSurveys } from "@/lib/use-surveys";
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
  const survey = typeof window !== "undefined" ? getSurveyBySlug(slug) : undefined;

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
  const lastPickRef = useRef<{ qid: string; resultType: string } | null>(null);

  const total = survey.questions.length;
  const q = survey.questions[i];
  const progress = phase === "done" ? 100 : (i / total) * 100;

  function next() {
    if (i < total - 1) setI(i + 1);
    else submit();
  }

  function submit() {
    addResponse({
      id: uid("r"),
      surveyId: survey.id,
      submittedAt: Date.now(),
      answers,
    });
    const rt = computeResultType(
      survey,
      answers,
      lastPickRef.current ? [lastPickRef.current] : undefined,
    );
    setResult(rt);
    setPhase("done");
  }

  const btnPrimary = buttonClasses(design.button_style, theme);
  const cardStyle = cardClasses(design.card_style, theme);

  if (phase === "intro") {
    return (
      <Wrap theme={theme} design={design}>
        <div
          style={{
            ...cardStyle,
            borderRadius: 24,
            padding: 36,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              color: theme.accent,
            }}
          >
            SELAH SURVEY ·{" "}
            {survey.audience_type === "christian" ? "FOR CHRISTIANS" : "GENERAL"}
          </p>
          <h1
            style={{
              marginTop: 18,
              fontSize: 32,
              lineHeight: 1.3,
              color: theme.text,
            }}
          >
            {survey.title}
          </h1>
          {survey.description && (
            <p
              style={{
                margin: "20px auto 0",
                maxWidth: 420,
                fontSize: 14,
                color: theme.text,
                opacity: 0.75,
              }}
            >
              {survey.description}
            </p>
          )}
          <p style={{ marginTop: 14, fontSize: 12, color: theme.muted }}>
            예상 소요 시간 · {survey.estimated_time}
          </p>
          {survey.audience_type === "christian" && survey.bible_verse && (
            <div
              style={{
                margin: "24px auto 0",
                maxWidth: 420,
                padding: 16,
                borderRadius: 16,
                backgroundColor: theme.bg,
                fontStyle: "italic",
                color: theme.accent,
                fontSize: 14,
              }}
            >
              “{survey.bible_verse}”
            </div>
          )}
          <p style={{ marginTop: 26, fontSize: 14, color: theme.text, opacity: 0.75 }}>
            정답은 없습니다. 지금의 상태와 가장 가까운 답을 선택해주세요.
          </p>
          <button
            onClick={() => setPhase("questions")}
            style={{
              ...btnPrimary,
              marginTop: 26,
              padding: "12px 32px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            시작하기
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
              borderRadius: 24,
              padding: 36,
            }}
          >
            <p style={{ fontSize: 12, letterSpacing: "0.25em", color: theme.accent, textAlign: "center" }}>
              YOUR RESULT
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
              }}
            >
              당신의 결과는 {result.title}이에요.
            </h1>
            {result.summary && (
              <p style={{ marginTop: 20, fontSize: 15, lineHeight: 1.65, color: theme.text, opacity: 0.85, textAlign: "center" }}>
                {result.summary}
              </p>
            )}
            {result.description && (
              <p style={{ marginTop: 18, fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap", color: theme.text, opacity: 0.8 }}>
                {result.description}
              </p>
            )}
            {(result.bibleVerse || (survey.audience_type === "christian" && survey.bible_verse)) && (
              <div
                style={{
                  marginTop: 24,
                  padding: 16,
                  borderRadius: 14,
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
              <p style={{ marginTop: 22, fontSize: 13, color: theme.muted, textAlign: "center", whiteSpace: "pre-wrap" }}>
                {survey.completion_message}
              </p>
            )}
          </div>

          <ResultActions survey={survey} result={result} design={design} theme={theme} />
        </Wrap>
      );
    }

    return (
      <Wrap theme={theme} design={design}>
        <div
          style={{
            ...cardStyle,
            borderRadius: 24,
            padding: 36,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 28, color: theme.text }}>제출이 완료되었습니다</h1>
          <p
            style={{
              marginTop: 18,
              fontSize: 14,
              whiteSpace: "pre-wrap",
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
                borderRadius: 16,
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
            {i + 1} / {total}
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

      <div style={{ ...cardStyle, borderRadius: 24, padding: 28 }}>
        <h2 style={{ fontSize: 24, lineHeight: 1.4, color: theme.text }}>{q.text}</h2>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          {q.type === "short_text" && (
            <input
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 14,
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
                borderRadius: 14,
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
                    borderRadius: 16,
                    border: `1px solid ${selected ? theme.selected : theme.border}`,
                    backgroundColor: selected ? theme.bg : theme.surface,
                    color: theme.text,
                    fontSize: 14,
                    textAlign: "left",
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
          {i === total - 1 ? "제출하기" : "다음"}
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
              padding: "12px 22px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              cursor: busy ? "wait" : "pointer",
              backgroundColor: "transparent",
              color: theme.accent,
              border: `1.5px solid ${theme.accent}`,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
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
        <ResultShareCard ref={cardRef} survey={survey} design={design} />
      </div>
    </>
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
          <svg width="22" height="22" viewBox="0 0 40 40">
            <path
              d="M20 4 C 30 8, 36 16, 32 26 C 28 34, 16 36, 10 30 C 4 24, 6 12, 14 8 C 18 6, 22 4, 20 4 Z"
              fill="none"
              stroke={theme.accent}
              strokeWidth="1.2"
            />
          </svg>
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.25em",
              color: theme.accent,
            }}
          >
            SELAH
          </span>
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
        <ResultDiagnosisCard ref={cardRef} survey={survey} result={result} design={design} />
      </div>
    </>
  );
}

