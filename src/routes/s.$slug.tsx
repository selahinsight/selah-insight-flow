import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addResponse, getSurveyBySlug, uid, type Survey } from "@/lib/survey-store";
import { useSurveys } from "@/lib/use-surveys";

export const Route = createFileRoute("/s/$slug")({
  component: RespondentSurvey,
});

function RespondentSurvey() {
  const { slug } = Route.useParams();
  useSurveys(); // hydrate
  const survey = typeof window !== "undefined" ? getSurveyBySlug(slug) : undefined;

  if (!survey) {
    return (
      <Wrap>
        <p className="font-serif text-2xl text-foreground">설문을 찾을 수 없습니다.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          링크가 만료되었거나 비공개로 전환되었을 수 있습니다.
        </p>
      </Wrap>
    );
  }
  if (survey.status !== "published") {
    return (
      <Wrap>
        <p className="font-serif text-2xl text-foreground">
          {survey.status === "closed" ? "이 설문은 종료되었습니다." : "이 설문은 아직 공개되지 않았습니다."}
        </p>
      </Wrap>
    );
  }

  return <Runner survey={survey} />;
}

type Phase = "intro" | "questions" | "done";

function Runner({ survey }: { survey: Survey }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});

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
    setPhase("done");
  }

  if (phase === "intro") {
    return (
      <Wrap>
        <div className="rounded-3xl border border-border/60 bg-white/80 p-8 shadow-card text-center">
          <p className="text-[11px] tracking-[0.25em] text-[var(--clay)]">
            SELAH SURVEY · {survey.audience_type === "christian" ? "FOR CHRISTIANS" : "GENERAL"}
          </p>
          <h1 className="mt-4 font-serif text-3xl leading-snug text-foreground md:text-4xl">
            {survey.title}
          </h1>
          {survey.description && (
            <p className="mx-auto mt-4 max-w-md text-sm text-foreground/75">{survey.description}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">예상 소요 시간 · {survey.estimated_time}</p>
          {survey.audience_type === "christian" && survey.bible_verse && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl bg-[var(--cream)] p-4 text-sm italic text-[var(--clay)]">
              “{survey.bible_verse}”
            </div>
          )}
          <p className="mt-6 text-sm text-foreground/70">
            정답은 없습니다. 지금의 상태와 가장 가까운 답을 선택해주세요.
          </p>
          <button
            onClick={() => setPhase("questions")}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--clay)] px-8 py-3 text-sm font-medium text-white shadow-soft"
          >
            시작하기
          </button>
        </div>
      </Wrap>
    );
  }

  if (phase === "done") {
    return (
      <Wrap>
        <div className="rounded-3xl border border-border/60 bg-white/80 p-8 shadow-card text-center">
          <h1 className="font-serif text-3xl text-foreground">제출이 완료되었습니다</h1>
          <p className="mt-4 text-sm text-foreground/75 whitespace-pre-wrap">
            {survey.completion_message}
          </p>
          {survey.audience_type === "christian" && survey.bible_verse && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl bg-[var(--cream)] p-4 text-sm italic text-[var(--clay)]">
              “{survey.bible_verse}”
            </div>
          )}
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {i + 1} / {total}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--rose-soft)]/30">
          <div
            className="h-full rounded-full bg-gradient-rose transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="font-serif text-2xl leading-snug text-foreground md:text-3xl">{q.text}</h2>

      <div className="mt-6 space-y-2">
        {q.type === "short_text" && (
          <input
            value={(answers[q.id] as string) ?? ""}
            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            className="w-full rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm"
            placeholder="답을 입력해주세요"
          />
        )}
        {q.type === "long_text" && (
          <textarea
            value={(answers[q.id] as string) ?? ""}
            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            rows={5}
            className="w-full rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm"
            placeholder="편하게 적어주세요"
          />
        )}
        {q.type === "scale_1_5" && (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = answers[q.id] === n;
              return (
                <button
                  key={n}
                  onClick={() => setAnswers({ ...answers, [q.id]: n })}
                  className={`h-12 w-12 rounded-full text-sm transition ${
                    active
                      ? "bg-[var(--clay)] text-white"
                      : "border border-border/60 bg-white hover:bg-[var(--rose-soft)]/30"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}
        {(q.type === "single_choice" || q.type === "multiple_choice") &&
          (q.options ?? []).map((o) => {
            const current = answers[q.id];
            const isMulti = q.type === "multiple_choice";
            const selected = isMulti
              ? Array.isArray(current) && current.includes(o)
              : current === o;
            return (
              <button
                key={o}
                onClick={() => {
                  if (isMulti) {
                    const arr = Array.isArray(current) ? [...current] : [];
                    const idx = arr.indexOf(o);
                    if (idx >= 0) arr.splice(idx, 1);
                    else arr.push(o);
                    setAnswers({ ...answers, [q.id]: arr });
                  } else {
                    setAnswers({ ...answers, [q.id]: o });
                  }
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left text-sm transition ${
                  selected
                    ? "border-[var(--clay)] bg-white shadow-card"
                    : "border-border/60 bg-white/70 hover:bg-white"
                }`}
              >
                <span>{o}</span>
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border ${
                    selected ? "border-[var(--clay)] bg-[var(--clay)]" : "border-border"
                  }`}
                >
                  {selected && (
                    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-white">
                      <path d="M1 5 L4 8 L9 2" stroke="currentColor" strokeWidth="1.8" fill="none" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setI(Math.max(0, i - 1))}
          disabled={i === 0}
          className="text-sm text-muted-foreground disabled:opacity-40"
        >
          이전
        </button>
        <button
          onClick={next}
          className="rounded-full bg-[var(--clay)] px-8 py-3 text-sm font-medium text-white shadow-soft"
        >
          {i === total - 1 ? "제출하기" : "다음"}
        </button>
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--ivory)] px-5 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <svg width="22" height="22" viewBox="0 0 40 40" className="text-[var(--clay)]">
            <path d="M20 4 C 30 8, 36 16, 32 26 C 28 34, 16 36, 10 30 C 4 24, 6 12, 14 8 C 18 6, 22 4, 20 4 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="font-serif text-xs tracking-[0.25em] text-[var(--clay)]">SELAH</span>
        </div>
        {children}
      </div>
    </div>
  );
}
