import { createFileRoute } from "@tanstack/react-router";

import {
  SELAH_MONEY_RESULT_TEMPLATE_CONTENT,
  type SelahMoneyResultTemplateContent,
} from "@/lib/selah-money-result-template";

export const Route = createFileRoute("/money-results-review")({
  component: PublicMoneyResultsReviewPage,
});

const moneyResults = Object.entries(SELAH_MONEY_RESULT_TEMPLATE_CONTENT).filter(
  ([id]) => !id.startsWith("faith_"),
);

function PublicMoneyResultsReviewPage() {
  return (
    <main className="min-h-screen bg-[#f5f0e8] px-4 py-10 text-[#443832]">
      <header className="mx-auto mb-10 max-w-5xl text-center">
        <p className="text-xs tracking-[0.2em] text-[#a66f5c]">SELAH MONEY DIAGNOSIS</p>
        <h1 className="mt-3 font-serif text-3xl">돈 유형 16개 전체 화면 검수</h1>
        <p className="mt-3 text-sm leading-6 text-[#75675f]">
          각 결과의 대표 마음, 마음 흐름, 본문과 실천까지 한 번에 확인할 수 있습니다.
        </p>
      </header>

      <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-2">
        {moneyResults.map(([id, content], index) => (
          <ResultCard key={id} index={index + 1} id={id} content={content} />
        ))}
      </div>
    </main>
  );
}

function ResultCard({
  index,
  id,
  content,
}: {
  index: number;
  id: string;
  content: SelahMoneyResultTemplateContent;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-[#dfd3c7] bg-white shadow-sm">
      <header className="border-b border-[#e7ddd3] bg-[#f1e4dc] px-6 py-5 text-center">
        <p className="text-xs text-[#a66f5c]">{index}. {id}</p>
        <h2 className="mt-2 font-serif text-2xl">{content.title}</h2>
      </header>

      <div className="mx-auto max-w-[390px] px-5 py-7">
        {content.sceneHook && <Block label="혹시 이런 모습이 익숙한가요?" text={content.sceneHook} centered />}
        <Block label="대표 마음" text={content.representativeHeart.join("\n")} quote />

        <section className="mb-7">
          <h3 className="mb-3 text-center text-sm font-semibold text-[#a66f5c]">내 마음은 이렇게 흘러가요</h3>
          <ol className="space-y-2">
            {content.flow.map((step, stepIndex) => (
              <li key={`${step}-${stepIndex}`}>
                <div className="whitespace-pre-line break-keep rounded-xl border border-[#e7ddd3] bg-[#fbf8f3] px-4 py-3 text-sm leading-6">
                  {step}
                </div>
                {stepIndex < content.flow.length - 1 && <p className="py-1 text-center text-[#b98a77]">↓</p>}
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-7 space-y-3 rounded-2xl bg-[#fbf8f3] p-5 text-sm leading-7 break-keep">
          {content.reading.map((paragraph, paragraphIndex) => (
            <p key={paragraph} className={paragraphIndex === 0 ? "font-semibold" : ""}>{paragraph}</p>
          ))}
        </section>

        <section className="rounded-2xl border border-[#d8b6a7] p-5">
          <h3 className="mb-2 text-sm font-semibold text-[#a66f5c]">이렇게 시작해보세요</h3>
          <ul className="space-y-2 text-sm leading-7 break-keep">
            {content.checklist.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </section>
      </div>
    </article>
  );
}

function Block({
  label,
  text,
  centered = false,
  quote = false,
}: {
  label: string;
  text: string;
  centered?: boolean;
  quote?: boolean;
}) {
  return (
    <section className="mb-7 rounded-2xl bg-[#fbf8f3] p-5">
      <h3 className="mb-2 text-xs font-semibold text-[#a66f5c]">{label}</h3>
      <p className={`whitespace-pre-line break-keep leading-7 ${centered ? "text-center text-sm" : ""} ${quote ? "font-serif text-base" : ""}`}>
        {quote ? `“${text}”` : text}
      </p>
    </section>
  );
}
