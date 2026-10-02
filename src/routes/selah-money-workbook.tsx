import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { MoneyStudyCourseFooter } from "../components/MoneyStudyCourseFooter";

export const Route = createFileRoute("/selah-money-workbook")({
  head: () => ({
    meta: [
      { title: "셀라 머니 워크북 | Selah Insight" },
      {
        name: "description",
        content:
          "돈 앞의 마음을 돌아보고 말씀의 기준을 세워, 나만의 예산과 소비 원칙을 실제 생활에 적용하는 50페이지 실행 워크북입니다.",
      },
    ],
  }),
  component: SelahMoneyWorkbookPage,
});

const workbookFlow = [
  {
    step: "01",
    title: "돈 앞의 마음을 돌아봅니다",
    description:
      "돈과 관련된 상황에서 반복되는 생각과 감정을 살펴보고, 지금까지의 돈 이야기를 차분히 정리합니다.",
  },
  {
    step: "02",
    title: "말씀 안에서 기준을 세웁니다",
    description:
      "나에게 돈이 무엇인지, 어떤 삶을 위해 사용하고 싶은지 돌아보며 나만의 돈 관리 기준을 세웁니다.",
  },
  {
    step: "03",
    title: "실제 예산과 선택에 적용합니다",
    description: "세운 기준을 예산·소비·저축·투자에 연결하고, 다음 달 돈의 흐름을 직접 계획합니다.",
  },
  {
    step: "04",
    title: "기록하고 다시 점검합니다",
    description:
      "한 주의 돈 관리를 기록하고 조정할 부분을 찾으며, 꾸준히 이어갈 작은 실천을 정합니다.",
  },
];

const workbookIncludes = [
  "돈 이야기와 반복되는 마음·행동 돌아보기",
  "돈의 의미와 삶의 우선순위 정리하기",
  "말씀을 바탕으로 나만의 돈 관리 기준 세우기",
  "예산·소비·저축·투자 기준을 실제 계획에 적용하기",
  "한 주 돈 관리 기록과 점검, 다음 실천 정하기",
  "3개월 후 다시 돌아보며 변화 확인하기",
];

const samplePages = [
  {
    src: "/selah-money-workbook-preview/page-10-money-meaning.webp",
    label: "SELAH MONEY WORKBOOK · 10쪽",
    title: "나에게 돈이란?",
    alt: "나에게 돈이 무엇인지 돌아보는 셀라 머니 워크북 10쪽",
  },
  {
    src: "/selah-money-workbook-preview/page-24-money-criteria.webp",
    label: "SELAH MONEY WORKBOOK · 24쪽",
    title: "말씀을 바탕으로 세우는 돈 관리 기준",
    alt: "말씀을 바탕으로 돈 관리 기준을 세우는 셀라 머니 워크북 24쪽",
  },
  {
    src: "/selah-money-workbook-preview/page-45-next-month-budget.webp",
    label: "SELAH MONEY WORKBOOK · 45쪽",
    title: "다음 달 예산 정하기",
    alt: "다음 달 수입과 예산을 작성하는 셀라 머니 워크북 45쪽",
  },
];

function showCheckoutNotice(product: "workbook" | "set") {
  const productName =
    product === "workbook" ? "셀라 머니 워크북" : "심층 리포트 + 머니 워크북 세트";
  window.alert(`${productName} 결제 링크를 준비 중입니다.`);
}

function SelahMoneyWorkbookPage() {
  return (
    <div className="money-workbook-page-shell">
      <main className="money-workbook-page">
        <header className="money-workbook-hero">
          <span className="money-workbook-eyebrow">SELAH MONEY WORKBOOK</span>
          <h1>셀라 머니 워크북</h1>
          <p className="money-workbook-hero-hook">
            나만의 돈 관리 기준이 생기면,
            <br />
            선택은 더 분명해지고
            <br />돈 앞의 마음은 평안해집니다.
          </p>

          <div className="money-workbook-hero-pages" aria-label="셀라 머니 워크북 실제 페이지">
            <img src={samplePages[0].src} alt="" aria-hidden="true" />
            <img src={samplePages[1].src} alt="" aria-hidden="true" />
            <img src={samplePages[2].src} alt="셀라 머니 워크북 실제 예산 페이지" />
          </div>

          <div className="money-workbook-hero-meta">
            <span>50페이지 실행 워크북</span>
            <span>다운로드형 PDF</span>
            <span className="money-workbook-hero-price-line" aria-hidden="true" />
            <s>정가 39,000원</s>
            <strong>런칭가 29,000원</strong>
          </div>
        </header>

        <section className="money-workbook-intro-section">
          <span className="money-workbook-section-symbol" aria-hidden="true" />
          <h2>
            돈 관리는 숫자보다
            <br />
            기준에서 시작됩니다
          </h2>
          <p>
            방법을 알아도 돈 앞에서 같은 선택을 반복하는 이유는,
            <br />내 마음과 삶의 기준이 아직 정리되지 않았기 때문일 수 있습니다.
          </p>
          <p>
            말씀을 바탕으로 나만의 기준을 세우고,
            <br />
            하나님이 맡기신 돈을 지혜롭게 관리해보세요.
          </p>
          <p>
            셀라 머니 워크북은 정답을 대신 정해주지 않습니다.
            <br />
            돈 앞의 마음을 돌아보고 말씀에 비추어,
            <br />
            스스로 기준을 세워 실제 생활에 적용하도록 돕습니다.
          </p>
        </section>

        <section className="money-workbook-flow-section">
          <span className="money-workbook-section-kicker">WORKBOOK FLOW</span>
          <h2>
            마음에서 시작해
            <br />
            실제 돈 관리까지 이어갑니다
          </h2>
          <div className="money-workbook-flow-list">
            {workbookFlow.map((item) => (
              <article key={item.step}>
                <span>{item.step}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="money-workbook-includes-section">
          <span className="money-workbook-section-kicker">50-PAGE WORKBOOK</span>
          <h2>
            워크북에서 직접
            <br />
            정리하고 결정합니다
          </h2>
          <ul>
            {workbookIncludes.map((item) => (
              <li key={item}>
                <Check size={17} strokeWidth={2} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="money-workbook-sample-section">
          <h2>셀라 머니 워크북 미리보기</h2>
          <div className="money-workbook-sample-pages">
            {samplePages.map((page) => (
              <figure key={page.src}>
                <img src={page.src} alt={page.alt} loading="lazy" />
                <figcaption>
                  <span>{page.label}</span>
                  <strong>{page.title}</strong>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="money-workbook-choice-section">
          <div className="money-workbook-choice-line" aria-hidden="true" />
          <h2>구매 옵션을 선택해보세요</h2>

          <article className="money-workbook-product-card">
            <span className="money-workbook-product-eyebrow">WORKBOOK ONLY</span>
            <h3>셀라 머니 워크북</h3>
            <p>50페이지 실행 워크북</p>
            <s>정가 39,000원</s>
            <strong>
              <small>런칭가</small> 29,000원
            </strong>
            <button type="button" onClick={() => showCheckoutNotice("workbook")}>
              워크북 구매하기
            </button>
          </article>

          <article className="money-workbook-product-card money-workbook-product-card--set">
            <span className="money-workbook-recommend-badge">추천</span>
            <span className="money-workbook-product-eyebrow">REPORT + WORKBOOK</span>
            <h3>심층 리포트 + 머니 워크북 세트</h3>
            <p>11페이지 개인 맞춤 리포트 + 50페이지 실행 워크북</p>
            <s>개별 런칭가 38,900원</s>
            <strong>
              <small>세트 런칭가</small> 34,900원
            </strong>
            <button type="button" onClick={() => showCheckoutNotice("set")}>
              세트 구매하기
            </button>
          </article>
        </section>

        <MoneyStudyCourseFooter />
      </main>
    </div>
  );
}
