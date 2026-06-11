import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
        <p className="font-serif text-2xl text-foreground">이 설문은 아직 비공개입니다.</p>
      </Wrap>
    );
  }

  return <Runner survey={survey} />;
}

function Runner({ survey }: { survey: Survey }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [submitted, setSubmitted] = useState<{ key: string } | null>(null);

  const q = survey.questions[i];
  const total = survey.questions.length;
  const progress = ((i + (submitted ? 1 : 0)) / total) * 100;

  function next() {
    if (i < total - 1) setI(i + 1);
    else submit();
  }

  function submit() {
    // pick the most common typeKey from selected options
    const counts: Record<string, number> = {};
    Object.entries(answers).forEach(([qid, val]) => {
      const question = survey.questions.find((x) => x.id === qid);
      if (!question?.options) return;
      const vals = Array.isArray(val) ? val : [val];
      vals.forEach((v) => {
        const opt = question.options!.find((o) => o.id === v);
        if (opt?.typeKey) counts[opt.typeKey] = (counts[opt.typeKey] ?? 0) + 1;
      });
    });
    const key =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      survey.resultTypes[0]?.key ??
      "A";
    addResponse({
      id: uid("r"),
      surveyId: survey.id,
      submittedAt: Date.now(),
      answers,
      resultTypeKey: key,
    });
    setSubmitted({ key });
  }

  if (submitted) {
    const t = survey.resultTypes.find((x) => x.key === submitted.key) ?? survey.resultTypes[0];
    return (
      <Wrap>
        <span className="rounded-full bg-[var(--clay)] px-4 py-1 text-xs text-white">
          당신의 유형 · {t.key}
        </span>
        <h1 className="mt-5 font-serif text-3xl text-foreground md:text-4xl">{t.name}</h1>
        <p className="mt-3 text-foreground/75">{t.oneLiner}</p>

        <div className="mt-8 rounded-2xl border border-border/60 bg-white/80 p-6 shadow-card">
          <p className="text-sm text-foreground/80">{survey.freeResultIntro}</p>
          <ul className="mt-4 space-y-2 text-sm text-foreground">
            {t.features.map((f, k) => (
              <li key={k} className="flex gap-2">
                <span className="text-[var(--clay)]">·</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-2xl bg-gradient-rose p-6 text-white shadow-soft">
          <p className="font-serif text-lg">{survey.paidResultIntro}</p>
          <a
            href={survey.ctaUrl || "#"}
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-[var(--clay)]"
          >
            {survey.ctaLabel || "상세 결과지 신청하기"}
          </a>
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
        {q.type === "text" && (
          <textarea
            value={(answers[q.id] as string) ?? ""}
            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            rows={5}
            className="w-full rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm"
            placeholder="편하게 적어주세요"
          />
        )}
        {q.type === "scale" && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => {
              const active = answers[q.id] === n;
              return (
                <button
                  key={n}
                  onClick={() => setAnswers({ ...answers, [q.id]: n })}
                  className={`h-11 w-11 rounded-full text-sm transition ${
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
        {(q.type === "single" || q.type === "multi") &&
          q.options?.map((o) => {
            const current = answers[q.id];
            const isMulti = q.type === "multi";
            const selected = isMulti
              ? Array.isArray(current) && current.includes(o.id)
              : current === o.id;
            return (
              <button
                key={o.id}
                onClick={() => {
                  if (isMulti) {
                    const arr = Array.isArray(current) ? [...current] : [];
                    const idx = arr.indexOf(o.id);
                    if (idx >= 0) arr.splice(idx, 1);
                    else arr.push(o.id);
                    setAnswers({ ...answers, [q.id]: arr });
                  } else {
                    setAnswers({ ...answers, [q.id]: o.id });
                  }
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left text-sm transition ${
                  selected
                    ? "border-[var(--clay)] bg-white shadow-card"
                    : "border-border/60 bg-white/70 hover:bg-white"
                }`}
              >
                <span>{o.label}</span>
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
          className="rounded-full bg-gradient-rose px-8 py-3 text-sm font-medium text-white shadow-soft"
        >
          {i === total - 1 ? "제출하고 결과 보기" : "다음"}
        </button>
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--ivory)] px-5 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 40 40" className="text-[var(--clay)]">
            <path
              d="M20 4 C 30 8, 36 16, 32 26 C 28 34, 16 36, 10 30 C 4 24, 6 12, 14 8 C 18 6, 22 4, 20 4 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
          <span className="font-serif text-xs tracking-[0.25em] text-[var(--clay)]">
            SELAH · DIAGNOSIS
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
