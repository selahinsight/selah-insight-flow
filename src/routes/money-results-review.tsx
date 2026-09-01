import { createFileRoute } from "@tanstack/react-router";

import { SelahMoneyEditorialResult } from "@/components/survey/selah-money-editorial-result";
import {
  SELAH_MONEY_RESULT_TEMPLATE_CONTENT,
} from "@/lib/selah-money-result-template";
import { THEMES } from "@/lib/survey-themes";

export const Route = createFileRoute("/money-results-review")({
  component: PublicMoneyResultsReviewPage,
});

const moneyResults = Object.entries(SELAH_MONEY_RESULT_TEMPLATE_CONTENT).filter(
  ([id]) => !id.startsWith("faith_"),
);
const faithResults = Object.entries(SELAH_MONEY_RESULT_TEMPLATE_CONTENT).filter(
  ([id]) => id.startsWith("faith_"),
);
const faithContent = SELAH_MONEY_RESULT_TEMPLATE_CONTENT.faith_low;
const reviewMoneyContent = SELAH_MONEY_RESULT_TEMPLATE_CONTENT.money_no_clear_pattern;
const theme = THEMES.warm_ivory;

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
          <article key={id} className="overflow-hidden rounded-3xl border border-[#dfd3c7] bg-[#fffbf3] shadow-sm">
            <header className="border-b border-[#e7ddd3] bg-[#f1e4dc] px-6 py-4 text-center">
              <p className="text-xs text-[#a66f5c]">{index + 1}. {id}</p>
            </header>
            <div className="mx-auto max-w-[390px] overflow-hidden bg-[#fffbf3]">
              <SelahMoneyEditorialResult
                name="김다윗"
                moneyContent={content}
                faithContent={faithContent}
                faithTitle={faithContent.title}
                theme={theme}
              />
            </div>
          </article>
        ))}
      </div>

      <header className="mx-auto mb-10 mt-20 max-w-5xl text-center">
        <p className="text-xs tracking-[0.2em] text-[#a66f5c]">SELAH MONEY &amp; FAITH</p>
        <h2 className="mt-3 font-serif text-3xl">신앙 유형 7개 전체 화면 검수</h2>
        <p className="mt-3 text-sm leading-6 text-[#75675f]">
          각 신앙 유형의 대표 마음, 마음 흐름, 본문과 통합 실천을 실제 결과 화면으로 확인할 수 있습니다.
        </p>
      </header>

      <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-2">
        {faithResults.map(([id, content], index) => (
          <article key={id} className="overflow-hidden rounded-3xl border border-[#dfd3c7] bg-[#fffbf3] shadow-sm">
            <header className="border-b border-[#e7ddd3] bg-[#f1e4dc] px-6 py-4 text-center">
              <p className="text-xs text-[#a66f5c]">{index + 1}. {id}</p>
            </header>
            <div className="mx-auto max-w-[390px] overflow-hidden bg-[#fffbf3]">
              <SelahMoneyEditorialResult
                name="김다윗"
                moneyContent={reviewMoneyContent}
                faithContent={content}
                faithTitle={content.title}
                theme={theme}
              />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
