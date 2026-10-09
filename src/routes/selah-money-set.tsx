import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DigitalContentRefundConsent, DigitalContentRefundNotice } from "../components/DigitalContentRefund";
import { MoneyStudyCourseFooter } from "../components/MoneyStudyCourseFooter";

export const Route = createFileRoute("/selah-money-set")({
  head: () => ({
    meta: [
      { title: "셀라 머니 리포트 + 워크북 세트 | Selah Insight" },
      {
        name: "description",
        content:
          "심층 리포트로 반복되는 돈 패턴을 이해하고, 셀라 머니 워크북으로 나만의 기준을 실제 돈 관리에 적용하는 세트입니다.",
      },
    ],
  }),
  component: SelahMoneySetPage,
});

const setSteps = [
  {
    step: "01",
    title: "이해",
    description: "돈 패턴",
  },
  {
    step: "02",
    title: "기준",
    description: "삶의 원칙",
  },
  {
    step: "03",
    title: "실행",
    description: "예산과 기록",
  },
];

const reportSamples = [
  {
    src: "/selah-money-report-preview/page-06-integration.png",
    label: "SELAH MONEY REPORT · 6쪽",
    title: "두 유형의 연결 해석",
    alt: "두 유형을 함께 해석한 셀라 머니 심층 리포트 6쪽",
  },
  {
    src: "/selah-money-report-preview/page-08-direction.png",
    label: "SELAH MONEY REPORT · 8쪽",
    title: "돈과 삶의 방향",
    alt: "돈과 삶의 방향을 담은 셀라 머니 심층 리포트 8쪽",
  },
];

const workbookSamples = [
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
    alt: "다음 달 예산을 작성하는 셀라 머니 워크북 45쪽",
  },
];

function SelahMoneySetPage() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [refundConsent, setRefundConsent] = useState(false);
  const [email, setEmail] = useState("");

  function openCheckout() {
    setRefundConsent(false);
    setCheckoutOpen(true);
  }

  function confirmCheckout() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/.+@.+\..+/.test(trimmedEmail)) {
      window.alert("리포트를 받을 이메일 주소를 확인해주세요.");
      return;
    }
    if (!refundConsent) return;
    window.sessionStorage.setItem(
      "selahMoneyCheckoutConsent",
      JSON.stringify({ product: "set", consentAt: new Date().toISOString(), email: trimmedEmail }),
    );
    window.alert("셀라 머니 세트 결제 링크를 준비 중입니다.");
  }

  return (
    <div className="money-workbook-page-shell">
      <main className="money-workbook-page money-set-page">
        <header className="money-workbook-hero money-set-hero">
          <span className="money-workbook-eyebrow">SELAH MONEY SET</span>
          <h1>셀라 머니 리포트 + 워크북 세트</h1>
          <p className="money-set-hero-hook">
            돈 앞의 나를 이해하고,
            <br />나만의 기준으로 실제 돈 관리를 시작해보세요.
          </p>

          <div className="money-set-hero-products" aria-label="셀라 머니 심층 리포트와 워크북 세트 구성">
            <figure>
              <img src="/selah-money-report-preview/page-01-cover.png" alt="셀라 머니 심층 리포트 표지" />
              <figcaption>11페이지 심층 리포트</figcaption>
            </figure>
            <span aria-hidden="true">+</span>
            <figure>
              <img src="/selah-money-workbook-preview/page-10-money-meaning.webp" alt="셀라 머니 워크북 실제 페이지" />
              <figcaption>50페이지 실행 워크북</figcaption>
            </figure>
          </div>

          <div className="money-set-hero-meta">
            <span>PDF 구성 · 리포트는 24시간 이내 이메일 발송</span>
            <div>
              <s>개별 런칭가 38,900원</s>
              <strong>세트 런칭가 34,900원</strong>
            </div>
            <em>4,000원 절약</em>
          </div>
          <DigitalContentRefundNotice bundle />
          <button className="money-set-hero-cta" type="button" onClick={openCheckout}>
            리포트 + 워크북 세트 구매하기
          </button>
        </header>

        <section className="money-set-need-section">
          <span className="money-workbook-section-kicker">WHY TOGETHER</span>
          <h2>왜 함께 구매해야 할까요?</h2>
          <div className="money-set-pair-reason">
            <article>
              <span>SELAH MONEY REPORT</span>
              <strong>나를 이해합니다</strong>
              <p>
                심층 리포트로 반복되는 돈 패턴과
                <br />앞으로의 방향을 확인합니다.
              </p>
            </article>
            <span aria-hidden="true">+</span>
            <article>
              <span>SELAH MONEY WORKBOOK</span>
              <strong>삶에 적용합니다</strong>
              <p>워크북으로 돈 관리 기준을 세우고 예산·소비·저축에 적용합니다.</p>
            </article>
          </div>
        </section>

        <section className="money-set-flow-section">
          <span className="money-workbook-section-kicker">FROM INSIGHT TO ACTION</span>
          <h2>이해에서 실행까지 이어집니다</h2>
          <div className="money-set-timeline">
            {setSteps.map((item) => (
              <article key={item.step}>
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="money-workbook-sample-section money-set-sample-section">
          <h2>실제 구성 일부를 미리 살펴보세요</h2>
          <div className="money-set-sample-group">
            <span>SELAH MONEY REPORT</span>
            <h3>심층 리포트 미리보기</h3>
            <div className="money-workbook-sample-pages">
            {reportSamples.map((page) => (
              <figure key={page.src}>
                <img src={page.src} alt={page.alt} loading="lazy" />
                <figcaption>
                  <span>{page.label}</span>
                  <strong>{page.title}</strong>
                </figcaption>
              </figure>
            ))}
            </div>
          </div>
          <div className="money-set-sample-plus" aria-hidden="true">+</div>
          <div className="money-set-sample-group">
            <span>SELAH MONEY WORKBOOK</span>
            <h3>워크북 미리보기</h3>
            <div className="money-workbook-sample-pages">
            {workbookSamples.map((page) => (
              <figure key={page.src}>
                <img src={page.src} alt={page.alt} loading="lazy" />
                <figcaption>
                  <span>{page.label}</span>
                  <strong>{page.title}</strong>
                </figcaption>
              </figure>
            ))}
            </div>
          </div>
        </section>

        <section className="money-set-purchase-section">
          <span className="money-workbook-section-kicker">SELAH MONEY SET</span>
          <h2>이해부터 실행까지 한 번에 시작해보세요</h2>
          <ul className="money-set-purchase-items">
            <li>11페이지 개인 맞춤 리포트</li>
            <li className="money-set-purchase-plus" aria-hidden="true">+</li>
            <li>50페이지 셀라 머니 워크북</li>
          </ul>
          <div className="money-set-purchase-price">
            <s>개별 런칭가 38,900원</s>
            <strong><small>세트 런칭가</small> 34,900원</strong>
            <em>4,000원 절약</em>
          </div>
          <DigitalContentRefundNotice bundle />
          <button type="button" onClick={openCheckout}>세트 구매하기</button>
        </section>

        <section className="money-set-single-links">
          <h2>각 상품을 자세히 보고 싶다면</h2>
          <nav className="money-set-single-nav" aria-label="단품 상세페이지">
            <a href="/selah-money-report">
              <span>셀라 머니 심층 리포트</span>
              <span aria-hidden="true">→</span>
            </a>
            <a href="/selah-money-workbook">
              <span>셀라 머니 워크북</span>
              <span aria-hidden="true">→</span>
            </a>
          </nav>
        </section>

        <MoneyStudyCourseFooter />

        {checkoutOpen && (
          <div className="money-report-detail-checkout" role="dialog" aria-modal="true" aria-label="결제 전 확인">
            <div>
              <button type="button" onClick={() => setCheckoutOpen(false)} aria-label="결제 전 확인 닫기">×</button>
              <span>BEFORE PAYMENT</span>
              <h2>결제 전에 확인해주세요</h2>
              <p className="money-checkout-product-summary"><small>REPORT + WORKBOOK</small><strong>심층 리포트 + 머니 워크북 세트</strong></p>
              <label htmlFor="set-detail-email">리포트를 받을 이메일</label>
              <input id="set-detail-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일 주소 입력" autoComplete="email" />
              <em>워크북은 즉시 제공되며, 맞춤 리포트는 결제 후 24시간 이내 이메일로 보내드립니다.</em>
              <DigitalContentRefundConsent id="set-refund-consent" bundle checked={refundConsent} onChange={setRefundConsent} />
              <button type="button" onClick={confirmCheckout} disabled={!refundConsent}>확인하고 결제하기</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
