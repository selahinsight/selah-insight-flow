import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DigitalContentRefundConsent, DigitalContentRefundNotice } from "../components/DigitalContentRefund";
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

const workbookOutcomes = [
  {
    step: "01",
    title: "돈 앞의 마음을 이해합니다",
    description:
      "반복되는 상황·생각·감정을 돌아보고, 나에게 돈이 어떤 의미인지 정리합니다.",
    result: "나의 돈 이야기와 반복 패턴",
  },
  {
    step: "02",
    title: "나만의 돈 관리 기준을 세웁니다",
    description:
      "말씀과 삶의 우선순위를 바탕으로 예산·소비·저축·투자의 기준을 정합니다.",
    result: "나만의 돈 관리 원칙",
  },
  {
    step: "03",
    title: "실제 계획에 적용하고 점검합니다",
    description:
      "다음 달 예산을 세우고, 한 주의 돈 관리를 기록하며 조정할 행동을 정합니다.",
    result: "월간 예산과 지속 가능한 점검 습관",
  },
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

function SelahMoneyWorkbookPage() {
  const [checkoutProduct, setCheckoutProduct] = useState<"workbook" | "set" | null>(null);
  const [refundConsent, setRefundConsent] = useState(false);
  const [email, setEmail] = useState("");

  function openCheckout(product: "workbook" | "set") {
    setCheckoutProduct(product);
    setRefundConsent(false);
  }

  function confirmCheckout() {
    if (!checkoutProduct || !refundConsent) return;
    const trimmedEmail = email.trim();
    if (checkoutProduct === "set" && (!trimmedEmail || !/.+@.+\..+/.test(trimmedEmail))) {
      window.alert("리포트를 받을 이메일 주소를 확인해주세요.");
      return;
    }
    window.sessionStorage.setItem(
      "selahMoneyCheckoutConsent",
      JSON.stringify({ product: checkoutProduct, consentAt: new Date().toISOString(), email: trimmedEmail || undefined }),
    );
    const productName = checkoutProduct === "workbook" ? "셀라 머니 워크북" : "심층 리포트 + 머니 워크북 세트";
    window.alert(`${productName} 결제 링크를 준비 중입니다.`);
  }

  return (
    <div className="money-workbook-page-shell">
      <main className="money-workbook-page">
        <header className="money-workbook-hero">
          <span className="money-workbook-eyebrow">SELAH MONEY WORKBOOK</span>
          <h1>셀라 머니 워크북</h1>
          <p className="money-workbook-hero-hook">
            돈 앞의 마음을 돌아보고,
            <br />
            나만의 기준으로 실제 돈 관리를 시작해보세요.
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
            돈 관리 방법을 알아도
            <br />
            같은 선택이 반복되나요?
          </h2>
          <ul className="money-workbook-need-list">
            <li>가계부를 시작해도 오래 이어지지 않을 때</li>
            <li>소비·저축의 기준이 상황에 따라 흔들릴 때</li>
            <li>신앙의 기준을 실제 돈 관리에 적용하기 어려울 때</li>
          </ul>
          <p className="money-workbook-need-conclusion">
            필요한 것은 더 많은 정보보다,
            <br />
            <strong>나에게 맞는 분명한 기준입니다.</strong>
          </p>
          <svg
            className="money-workbook-need-arrow"
            viewBox="0 0 18 10"
            aria-hidden="true"
          >
            <path d="M3 2l6 6 6-6" />
          </svg>
        </section>

        <section className="money-workbook-outcomes-section">
          <span className="money-workbook-section-kicker">WORKBOOK RESULTS</span>
          <h2>워크북으로 완성하는 세 가지</h2>
          <div className="money-workbook-outcome-list">
            {workbookOutcomes.map((item) => (
              <article key={item.step}>
                <span>{item.step}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <strong>
                    <small>완성되는 결과</small>
                    {item.result}
                  </strong>
                </div>
              </article>
            ))}
          </div>
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
            <button type="button" onClick={() => openCheckout("workbook")}>
              워크북 구매하기
            </button>
          </article>

          <article className="money-workbook-product-card money-workbook-product-card--set">
            <span className="money-workbook-recommend-badge">추천</span>
            <span className="money-workbook-product-eyebrow">REPORT + WORKBOOK</span>
            <h3>심층 리포트 + 머니 워크북 세트</h3>
            <p>
              반복되는 돈 패턴을 이해하고,
              <br />나만의 기준으로 실제 돈 관리까지 이어가는 구성
            </p>
            <s>개별 런칭가 38,900원</s>
            <strong>
              <small>세트 런칭가</small> 34,900원
            </strong>
            <button type="button" onClick={() => openCheckout("set")}>
              세트 구매하기
            </button>
          </article>
        </section>

        <MoneyStudyCourseFooter />

        {checkoutProduct && (
          <div className="money-report-detail-checkout" role="dialog" aria-modal="true" aria-label="결제 전 확인">
            <div>
              <button type="button" onClick={() => setCheckoutProduct(null)} aria-label="결제 전 확인 닫기">×</button>
              <span>BEFORE PAYMENT</span>
              <h2>결제 전에 확인해주세요</h2>
              <p className="money-checkout-product-summary">
                <small>{checkoutProduct === "workbook" ? "WORKBOOK ONLY" : "REPORT + WORKBOOK"}</small>
                <strong>{checkoutProduct === "workbook" ? "셀라 머니 워크북" : "심층 리포트 + 머니 워크북 세트"}</strong>
              </p>
              {checkoutProduct === "set" && (
                <>
                  <label htmlFor="workbook-set-email">리포트를 받을 이메일</label>
                  <input id="workbook-set-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일 주소 입력" autoComplete="email" />
                </>
              )}
              <em>{checkoutProduct === "workbook" ? "워크북 PDF는 결제 완료 후 즉시 제공됩니다." : "워크북은 즉시 제공되며, 맞춤 리포트는 결제 후 24시간 이내 이메일로 보내드립니다."}</em>
              <DigitalContentRefundConsent id="workbook-refund-consent" bundle={checkoutProduct === "set"} checked={refundConsent} onChange={setRefundConsent} />
              <button type="button" onClick={confirmCheckout} disabled={!refundConsent}>확인하고 결제하기</button>
              <DigitalContentRefundNotice bundle={checkoutProduct === "set"} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
