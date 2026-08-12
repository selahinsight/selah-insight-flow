import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  SELAH_MONEY_RESULT_TEMPLATE_CONTENT,
  type SelahMoneyResultTemplateContent,
} from "@/lib/selah-money-result-template";

export const Route = createFileRoute("/admin/money-results-review")({
  component: MoneyResultsReviewPage,
});

const entries = Object.entries(SELAH_MONEY_RESULT_TEMPLATE_CONTENT);
const moneyResults = entries.filter(([id]) => !id.startsWith("faith_"));
const faithResults = entries.filter(([id]) => id.startsWith("faith_"));

function MoneyResultsReviewPage() {
  return (
    <AdminShell
      title="머니 결과 전체 검수"
      subtitle={`돈 유형 ${moneyResults.length}개 · 신앙 유형 ${faithResults.length}개를 모바일 폭으로 확인합니다.`}
    >
      <ReviewGroup title="돈 유형" entries={moneyResults} kind="money" />
      <ReviewGroup title="신앙 유형" entries={faithResults} kind="faith" />
    </AdminShell>
  );
}

function ReviewGroup({
  title,
  entries,
  kind,
}: {
  title: string;
  entries: [string, SelahMoneyResultTemplateContent][];
  kind: "money" | "faith";
}) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-border/60 pb-3">
        <h2 className="font-serif text-2xl">{title}</h2>
        <span className="text-xs text-muted-foreground">{entries.length}개</span>
      </div>
      <div className="grid items-start gap-8 xl:grid-cols-2 2xl:grid-cols-3">
        {entries.map(([id, content]) => (
          <ResultReviewCard key={id} id={id} content={content} kind={kind} />
        ))}
      </div>
    </section>
  );
}

function ResultReviewCard({
  id,
  content,
  kind,
}: {
  id: string;
  content: SelahMoneyResultTemplateContent;
  kind: "money" | "faith";
}) {
  const checks = [
    { label: `본문 ${content.reading.length}문장`, ok: content.reading.length === 3 },
    { label: `마음 흐름 ${content.flow.length}단계`, ok: kind === "faith" || content.flow.length === 5 },
    { label: `실천 ${content.checklist.length}개`, ok: content.checklist.length > 0 },
  ];
  const params = kind === "money"
    ? `primary=${encodeURIComponent(id)}&faith=faith_low`
    : `primary=organizing_delay&faith=${encodeURIComponent(id)}`;

  return (
    <article className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-[var(--cream)]/60 px-5 py-4">
        <div>
          <h3 className="font-serif text-xl">{content.title}</h3>
          <code className="text-[10px] text-muted-foreground">{id}</code>
        </div>
        <a
          href={`/s/selah-money-d?layout=editorial&${params}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs text-[var(--clay)]"
        >
          실제 화면 <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      <div className="flex flex-wrap gap-2 px-5 pt-4">
        {checks.map((check) => (
          <span
            key={check.label}
            className={`rounded-full px-2.5 py-1 text-[10px] ${check.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
          >
            {check.ok ? "✓" : "!"} {check.label}
          </span>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[390px] px-5 py-6">
        {content.sceneHook && <PreviewSection label="익숙한가요?" text={content.sceneHook} centered />}
        <PreviewSection label="대표 마음" text={content.representativeHeart.join("\n")} quote />
        <PreviewSection label="유형 카드" text={content.reading[0]} emphasized />

        <div className="mb-6">
          <p className="mb-3 text-center text-xs font-semibold text-[var(--clay)]">내 마음은 이렇게 흘러가요</p>
          <ol className="space-y-2">
            {content.flow.map((step, index) => (
              <li key={`${step}-${index}`} className="rounded-xl border border-border/60 bg-[var(--ivory)] px-4 py-3 text-sm leading-6 whitespace-pre-line break-keep">
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="mb-6 space-y-3 rounded-2xl bg-[var(--ivory)] p-5 text-sm leading-7 break-keep">
          {content.reading.map((paragraph, index) => (
            <p key={paragraph} className={index === 0 ? "font-semibold" : ""}>{paragraph}</p>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--clay)]/20 p-5">
          <p className="mb-2 text-xs font-semibold text-[var(--clay)]">이렇게 시작해보세요</p>
          <p className="text-sm leading-7 break-keep">{content.checklist[0]}</p>
        </div>
      </div>
    </article>
  );
}

function PreviewSection({
  label,
  text,
  centered = false,
  quote = false,
  emphasized = false,
}: {
  label: string;
  text: string;
  centered?: boolean;
  quote?: boolean;
  emphasized?: boolean;
}) {
  return (
    <div className={`mb-6 rounded-2xl p-5 ${emphasized ? "border border-[var(--clay)]/25 bg-[var(--cream)]/50" : "bg-[var(--ivory)]"}`}>
      <p className="mb-2 text-xs font-semibold text-[var(--clay)]">{label}</p>
      <p className={`whitespace-pre-line break-keep text-sm leading-7 ${centered ? "text-center" : ""} ${quote ? "font-serif text-base" : ""}`}>
        {quote ? `“${text}”` : text}
      </p>
    </div>
  );
}
