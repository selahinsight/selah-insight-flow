import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { MoneyStudyCourseFooter } from "../components/MoneyStudyCourseFooter";

export const Route = createFileRoute("/selah-money-report")({
  head: () => ({
    meta: [
      { title: "셀라 머니 심층 리포트 | Selah Insight" },
      {
        name: "description",
        content:
          "무료 진단에서 확인한 돈 반응과 신앙 유형을 함께 해석하고, 앞으로의 돈 관리 기준과 방향을 세우는 11페이지 개인 맞춤 리포트입니다.",
      },
    ],
  }),
  component: SelahMoneyReportPage,
});

type ReportContext = {
  name?: string;
  moneyTitle?: string;
  faithTitle?: string;
  email?: string;
};

const reportBenefits = [
  "돈 앞에서 왜 늘 비슷한 생각과 행동을 반복하는지 이해합니다.",
  "마음과 믿음이 소비·저축 등 실제 돈 관리에 어떻게 나타나는지 살펴봅니다.",
  "내가 이미 가진 강점과 돈 관리를 어렵게 만드는 부분을 확인합니다.",
  "나에게 돈이 무엇인지 정리하고, 말씀을 바탕으로 앞으로의 돈 관리 기준과 방향을 세웁니다.",
];

const reportSamples = [
  {
    src: "/selah-money-report-preview/page-06-integration.png",
    label: "SELAH MONEY REPORT · 6쪽",
    title: "두 유형의 연결 해석",
    alt: "두 유형을 함께 해석한 실제 심층 리포트 6쪽",
  },
  {
    src: "/selah-money-report-preview/page-08-direction.png",
    label: "SELAH MONEY REPORT · 8쪽",
    title: "돈과 삶의 방향",
    alt: "돈과 삶의 방향을 담은 실제 심층 리포트 8쪽",
  },
  {
    src: "/selah-money-report-preview/page-10-summary.png",
    label: "SELAH MONEY REPORT · 10쪽",
    title: "전체 결과 정리",
    alt: "전체 진단 결과를 정리한 실제 심층 리포트 10쪽",
  },
];

const workbookSamples = [
  {
    src: "/selah-money-workbook-preview/page-24-money-criteria.webp",
    label: "SELAH MONEY WORKBOOK · 24쪽",
    title: "말씀을 바탕으로 돈 관리 기준 세우기",
    alt: "말씀을 바탕으로 돈 관리 기준을 세우는 셀라 머니 워크북 24쪽",
  },
  {
    src: "/selah-money-workbook-preview/page-45-next-month-budget.webp",
    label: "SELAH MONEY WORKBOOK · 45쪽",
    title: "다음 달 예산 작성하기",
    alt: "다음 달 예산을 작성하는 셀라 머니 워크북 45쪽",
  },
];

function SelahMoneyReportPage() {
  const [context, setContext] = useState<ReportContext>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [email, setEmail] = useState("");
  const checkoutUrl = (import.meta.env.VITE_SELAH_MONEY_REPORT_CHECKOUT_URL as string | undefined)?.trim();

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem("selahMoneyReportContext");
      if (!saved) return;
      const parsed = JSON.parse(saved) as ReportContext;
      setContext(parsed);
      setEmail(parsed.email ?? "");
    } catch {
      // Direct visits use the sample state below.
    }
  }, []);

  const displayName = context.name?.trim() || "OOO";
  const moneyTitle = context.moneyTitle?.trim() || "회피위로형";
  const faithTitle = context.faithTitle?.trim() || "신앙연결형";

  function confirmCheckout() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/.+@.+\..+/.test(trimmedEmail)) {
      window.alert("리포트를 받을 이메일 주소를 확인해주세요.");
      return;
    }
    if (checkoutUrl) {
      window.location.assign(checkoutUrl);
      return;
    }
    window.alert("결제 링크를 준비 중입니다.");
  }

  return (
    <div className="money-workbook-page-shell">
      <main className="money-workbook-page money-report-detail-page">
        <header className="money-workbook-hero money-report-detail-hero">
          <span className="money-workbook-eyebrow">SELAH MONEY REPORT</span>
          <h1>셀라 머니 심층 리포트</h1>
          <p className="money-report-detail-hook">
            내 진단 결과로
            <br />‘나만의 맞춤 리포트’가 만들어집니다
          </p>
          <span className="money-report-detail-divider" aria-hidden="true" />
          <p className="money-report-detail-result-label">{displayName}님의 진단 결과</p>
          <p className="money-report-detail-types">
            {moneyTitle} <strong>×</strong> {faithTitle}
          </p>

          <div className="money-report-detail-product">
            <img src="/selah-money-report-preview/page-01-cover.png" alt="셀라 머니 심층 리포트 표지" />
            <div>
              <span>11페이지 개인 맞춤 PDF</span>
              <span>결제 후 24시간 이내 이메일 발송</span>
              <div className="money-report-detail-hero-price">
                <s>정가 15,000원</s>
                <span aria-hidden="true">↓</span>
                <strong>런칭가 9,900원</strong>
              </div>
            </div>
          </div>
        </header>

        <section className="money-report-detail-difference">
          <span className="money-workbook-section-symbol" aria-hidden="true" />
          <h2>무료 결과와 무엇이 다를까요?</h2>
          <article>
            <h3>무료 진단 결과</h3>
            <ul>
              <li><Check size={17} aria-hidden="true" />나의 돈 유형과 신앙 유형</li>
              <li><Check size={17} aria-hidden="true" />각 유형의 기본 특징</li>
            </ul>
          </article>
          <article className="money-report-detail-benefits">
            <span>SELAH MONEY REPORT</span>
            <h3>셀라 머니 심층 리포트</h3>
            <ul>
              {reportBenefits.map((benefit) => (
                <li key={benefit}><Check size={17} aria-hidden="true" />{benefit}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="money-workbook-sample-section money-report-detail-samples">
          <h2>셀라 머니 심층 리포트 미리보기</h2>
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
        </section>

        <section className="money-report-detail-purchase-strip">
          <div>
            <s>정가 15,000원</s>
            <span className="money-report-detail-price-arrow" aria-hidden="true">→</span>
            <strong>런칭가 9,900원</strong>
          </div>
          <button type="button" onClick={() => setCheckoutOpen(true)}>셀라 머니 심층 리포트 구매하기</button>
        </section>

        <section className="money-report-detail-workbook-link">
          <span>SELAH MONEY WORKBOOK</span>
          <h2>
            돈 앞의 마음과 방향을 알았다면,
            <br />이제 실제 돈 관리에 적용해보세요.
          </h2>
          <small>50페이지 실행 워크북</small>
          <p>
            말씀을 바탕으로 나만의 돈 관리 기준을 세우고,
            <br />예산·소비·저축에 직접 적용해보세요.
          </p>
          <div className="money-report-detail-workbook-samples">
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
          <a href="/selah-money-workbook">셀라 머니 워크북 자세히 보기</a>
        </section>

        <section className="money-workbook-choice-section money-report-detail-options">
          <div className="money-workbook-choice-line" aria-hidden="true" />
          <h2>구매 옵션을 선택해보세요</h2>
          <article className="money-workbook-product-card">
            <span className="money-workbook-product-eyebrow">REPORT ONLY</span>
            <h3>셀라 머니 심층 리포트</h3>
            <p>11페이지 개인 맞춤 PDF</p>
            <s>정가 15,000원</s>
            <strong><small>런칭가</small> 9,900원</strong>
            <button type="button" onClick={() => setCheckoutOpen(true)}>심층 리포트 구매하기</button>
          </article>
          <article className="money-workbook-product-card money-workbook-product-card--set">
            <span className="money-workbook-recommend-badge">추천</span>
            <span className="money-workbook-product-eyebrow">REPORT + WORKBOOK</span>
            <h3>심층 리포트 + 머니 워크북 세트</h3>
            <p>11페이지 리포트 + 50페이지 실행 워크북</p>
            <s>개별 런칭가 38,900원</s>
            <strong><small>세트 런칭가</small> 34,900원</strong>
            <a href="https://selahinsight.co.kr/money-study">세트 구매하기</a>
          </article>
        </section>

        <MoneyStudyCourseFooter />

        {checkoutOpen && (
          <div className="money-report-detail-checkout" role="dialog" aria-modal="true" aria-label="결제 전 확인">
            <div>
              <button type="button" onClick={() => setCheckoutOpen(false)} aria-label="결제 전 확인 닫기">×</button>
              <span>BEFORE PAYMENT</span>
              <h2>결제 전에 확인해주세요</h2>
              <p><small>{displayName}님의 진단 결과</small><strong>{moneyTitle} × {faithTitle}</strong></p>
              <label htmlFor="report-detail-email">리포트를 받을 이메일</label>
              <input id="report-detail-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일 주소 입력" autoComplete="email" />
              <em>맞춤 리포트는 결제 후 24시간 이내 이메일로 보내드립니다.</em>
              <button type="button" onClick={confirmCheckout}>확인하고 결제하기</button>
              <a href="/s/selah-money-d">진단 다시하기</a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
