import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DigitalContentCheckoutConsents,
  DigitalContentRefundNotice,
} from "../components/DigitalContentRefund";
import { MoneyStudyCourseFooter } from "../components/MoneyStudyCourseFooter";
import { KakaoContactLink } from "../components/SelahKakaoContact";
import { CreditCardPaymentMethod } from "../components/CreditCardPaymentMethod";
import { LimitedLaunchPrice } from "../components/LimitedLaunchPrice";
import { createMoneyOrder, verifyMoneyPayment } from "../lib/money-orders.functions";
import { requestMoneyPayment } from "../lib/portone-payment";
import { validateMoneyCoupon } from "../lib/coupon.functions";

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
  responseId?: string;
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
  const [termsConsent, setTermsConsent] = useState(false);
  const [digitalConsent, setDigitalConsent] = useState(false);
  const [customConsent, setCustomConsent] = useState(false);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [reportSampleIndex, setReportSampleIndex] = useState(0);
  const reportSamplesRef = useRef<HTMLDivElement>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponPhone, setCouponPhone] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponResult, setCouponResult] = useState<null | { code: string; discountRate: number | null; discountAmount: number; originalAmount: number; finalAmount: number }>(null);
  const [couponMessage, setCouponMessage] = useState("");

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

  useEffect(() => {
    const paymentId = new URLSearchParams(window.location.search).get("paymentId");
    if (!paymentId) return;
    const marker = `selahMoneyVerified:${paymentId}`;
    if (window.sessionStorage.getItem(marker)) return;
    void verifyMoneyPayment({ data: { paymentId } })
      .then(() => {
        window.sessionStorage.setItem(marker, "1");
        window.alert("결제가 확인되었습니다. 입력하신 이메일로 상품을 보내드립니다.");
      })
      .catch((error) => {
        window.alert(error instanceof Error ? error.message : "결제 확인 중 오류가 발생했습니다.");
      });
  }, []);

  const displayName = context.name?.trim() || "OOO";
  const moneyTitle = context.moneyTitle?.trim() || "회피위로형";
  const faithTitle = context.faithTitle?.trim() || "신앙연결형";

  function openCheckout() {
    setTermsConsent(false);
    setDigitalConsent(false);
    setCustomConsent(false);
    setRestartConfirmOpen(false);
    setCheckoutOpen(true);
  }

  function moveReportPreview(nextIndex: number) {
    const index = Math.max(0, Math.min(reportSamples.length - 1, nextIndex));
    const page = reportSamplesRef.current?.children.item(index);
    if (!(page instanceof HTMLElement)) return;
    page.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setReportSampleIndex(index);
  }

  function syncReportPreviewIndex() {
    const container = reportSamplesRef.current;
    if (!container) return;
    const center = container.scrollLeft + container.clientWidth / 2;
    const pages = Array.from(container.children).filter(
      (page): page is HTMLElement => page instanceof HTMLElement,
    );
    const nearestIndex = pages.reduce((nearest, page, index) => {
      const pageCenter = page.offsetLeft + page.offsetWidth / 2;
      const nearestPage = pages[nearest];
      const nearestCenter = nearestPage.offsetLeft + nearestPage.offsetWidth / 2;
      return Math.abs(pageCenter - center) < Math.abs(nearestCenter - center) ? index : nearest;
    }, 0);
    setReportSampleIndex(nearestIndex);
  }

  async function applyCoupon() {
    if (couponResult) {
      setCouponResult(null);
      setCouponMessage("");
      return;
    }
    if (!couponCode.trim()) {
      setCouponMessage("쿠폰 코드를 입력해주세요.");
      return;
    }
    const normalizedPhone = couponPhone.replace(/\D/g, "");
    if (!/^010\d{8}$/.test(normalizedPhone)) {
      setCouponMessage("휴대폰번호를 정확히 입력해주세요.");
      return;
    }
    setCouponApplying(true);
    setCouponMessage("");
    try {
      const result = await validateMoneyCoupon({ data: { code: couponCode, productCode: "report", phone: normalizedPhone } });
      if (!result.valid) {
        setCouponMessage(result.message);
        return;
      }
      setCouponCode(result.code);
      setCouponResult(result);
      setCouponMessage("쿠폰이 적용되었습니다.");
    } catch (error) {
      setCouponMessage(error instanceof Error ? error.message : "쿠폰을 확인하지 못했습니다.");
    } finally {
      setCouponApplying(false);
    }
  }

  function restartDiagnosis() {
    setEmail("");
    window.sessionStorage.removeItem("selahMoneyReportContext");
    window.location.assign("/s/selah-money-d");
  }

  async function confirmCheckout() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/.+@.+\..+/.test(trimmedEmail)) {
      window.alert("리포트를 받을 이메일 주소를 확인해주세요.");
      return;
    }
    if (!termsConsent || !digitalConsent || !customConsent) {
      window.alert("필수 이용약관과 취소·환불 조건에 모두 동의해주세요.");
      return;
    }
    const consentAt = new Date().toISOString();
    setCreatingOrder(true);
    try {
      const order = await createMoneyOrder({
        data: {
          productCode: "report",
          email: trimmedEmail,
          customerName: context.name,
          surveyResponseId: context.responseId,
          moneyType: context.moneyTitle,
          faithType: context.faithTitle,
          refundConsentAt: consentAt,
          sourcePath: window.location.pathname,
          couponCode: couponResult?.code || null,
          couponPhone: couponResult ? couponPhone : null,
        },
      });
      window.sessionStorage.setItem(
        "selahMoneyCheckoutConsent",
        JSON.stringify({ product: "report", consentAt, email: trimmedEmail }),
      );
      window.sessionStorage.setItem("selahMoneyPendingOrder", JSON.stringify(order));
      if (order.amount === 0) {
        window.alert("100% 쿠폰이 적용되었습니다. 결제 없이 주문이 완료되었으며, 맞춤 리포트는 24시간 이내 입력하신 이메일로 보내드립니다.");
        setCheckoutOpen(false);
        return;
      }
      const payment = await requestMoneyPayment(order, context.name);
      if (payment.completed) {
        await verifyMoneyPayment({ data: { paymentId: payment.paymentId } });
        window.alert("결제가 완료되었습니다. 맞춤 리포트는 24시간 이내 입력하신 이메일로 보내드립니다.");
        setCheckoutOpen(false);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "주문 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setCreatingOrder(false);
    }
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
              <LimitedLaunchPrice current="9,900원" original="15,000원" className="money-report-detail-hero-price" />
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
          <div className="money-report-preview-carousel">
            <button
              className="money-report-preview-arrow money-report-preview-arrow--previous"
              type="button"
              onClick={() => moveReportPreview(reportSampleIndex - 1)}
              disabled={reportSampleIndex === 0}
              aria-label="이전 리포트 미리보기"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <div
              ref={reportSamplesRef}
              className="money-workbook-sample-pages"
              onScroll={syncReportPreviewIndex}
            >
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
            <button
              className="money-report-preview-arrow money-report-preview-arrow--next"
              type="button"
              onClick={() => moveReportPreview(reportSampleIndex + 1)}
              disabled={reportSampleIndex === reportSamples.length - 1}
              aria-label="다음 리포트 미리보기"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
          <div className="money-report-preview-pagination" aria-live="polite">
            {reportSamples.map((page, index) => (
              <button
                key={page.src}
                type="button"
                className={index === reportSampleIndex ? "is-active" : ""}
                onClick={() => moveReportPreview(index)}
                aria-label={`${index + 1}번째 리포트 미리보기`}
                aria-current={index === reportSampleIndex ? "true" : undefined}
              />
            ))}
          </div>
        </section>

        <section className="money-report-detail-purchase-strip">
          <LimitedLaunchPrice current="9,900원" original="15,000원" />
          <button type="button" onClick={openCheckout}>셀라 머니 심층 리포트 구매하기</button>
          <DigitalContentRefundNotice />
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
            <LimitedLaunchPrice current="9,900원" original="15,000원" />
            <button type="button" onClick={openCheckout}>심층 리포트 구매하기</button>
          </article>
          <article className="money-workbook-product-card money-workbook-product-card--set">
            <span className="money-workbook-recommend-badge">추천</span>
            <span className="money-workbook-product-eyebrow">REPORT + WORKBOOK</span>
            <h3>심층 리포트 + 머니 워크북 세트</h3>
            <p>11페이지 리포트 + 50페이지 실행 워크북</p>
            <LimitedLaunchPrice current="34,900원" original="38,900원" currentLabel="세트 런칭가" originalLabel="개별 런칭가" />
            <a href="/selah-money-set">세트 구매하기</a>
          </article>
        </section>

        <MoneyStudyCourseFooter />

        {checkoutOpen && (
          <div className="money-report-detail-checkout money-report-detail-checkout--report" role="dialog" aria-modal="true" aria-label="결제 전 확인">
            <div>
              <button className="money-report-detail-checkout-close" type="button" onClick={() => { setCheckoutOpen(false); setRestartConfirmOpen(false); }} aria-label="결제 전 확인 닫기">×</button>
              {restartConfirmOpen ? (
                <>
                  <span>RESTART CHECK</span>
                  <h2>검사를 다시 하시겠어요?</h2>
                  <div className="money-report-detail-restart-copy">검사를 다시 하면 현재 결과 대신 새 검사 결과가 심층 리포트에 반영됩니다.</div>
                  <div className="money-report-detail-restart-actions">
                    <button type="button" onClick={restartDiagnosis}>검사 다시하기</button>
                    <button type="button" onClick={() => setRestartConfirmOpen(false)}>현재 결과 유지</button>
                  </div>
                </>
              ) : (
                <>
                  <span>BEFORE PAYMENT</span>
                  <h2>결제 전에 확인해주세요</h2>
                  <p className="money-checkout-product-summary"><small>{displayName}님의 진단 결과</small><strong>{moneyTitle} × {faithTitle}</strong></p>
                  <label htmlFor="report-detail-email">리포트를 받을 이메일</label>
                  <input id="report-detail-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일 주소 입력" autoComplete="email" />
                  <em>맞춤 리포트는 결제 후 24시간 이내 이메일로 보내드립니다.</em>
                  <section className="money-checkout-coupon" aria-label="할인쿠폰">
                      <button
                        className="money-checkout-coupon-toggle"
                        type="button"
                        onClick={() => setCouponOpen((open) => !open)}
                        aria-expanded={couponOpen}
                      >
                        <span>쿠폰이 있으신가요?</span>
                        <span aria-hidden="true">{couponOpen ? "−" : "+"}</span>
                      </button>
                      {couponOpen && (
                        <div className="money-checkout-coupon-body">
                          <label className="money-checkout-coupon-phone-label">
                            휴대폰번호
                            <input
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel"
                              value={couponPhone}
                              onChange={(event) => {
                                setCouponPhone(event.target.value.replace(/[^0-9-]/g, ""));
                                setCouponResult(null);
                                setCouponMessage("");
                              }}
                              placeholder="010-1234-5678"
                              maxLength={13}
                            />
                          </label>
                          <div className="money-checkout-coupon-form">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(event) => {
                                setCouponCode(event.target.value.toUpperCase());
                                setCouponResult(null);
                                setCouponMessage("");
                              }}
                              placeholder="쿠폰 코드를 입력하세요"
                              autoComplete="off"
                            />
                            <button type="button" onClick={applyCoupon} disabled={couponApplying}>{couponResult ? "취소" : couponApplying ? "확인 중" : "적용"}</button>
                          </div>
                          <p className="money-checkout-coupon-notice">본 쿠폰은 휴대폰번호당 1회 사용할 수 있습니다.</p>
                          {couponMessage && <p className={couponResult ? "money-checkout-coupon-success" : "money-checkout-coupon-error"}>{couponMessage}</p>}
                          {couponResult && (
                            <>
                              <dl className="money-checkout-price-summary">
                                <div><dt>상품금액</dt><dd>{couponResult.originalAmount.toLocaleString("ko-KR")}원</dd></div>
                                <div className="money-checkout-price-discount"><dt>쿠폰 할인{couponResult.discountRate ? ` (${couponResult.discountRate}%)` : ""}</dt><dd>-{couponResult.discountAmount.toLocaleString("ko-KR")}원</dd></div>
                                <div className="money-checkout-price-total"><dt>최종 결제금액</dt><dd>{couponResult.finalAmount.toLocaleString("ko-KR")}원</dd></div>
                              </dl>
                            </>
                          )}
                        </div>
                      )}
                  </section>
                  {couponResult?.finalAmount !== 0 && <CreditCardPaymentMethod />}
                  <button className="money-report-detail-restart" type="button" onClick={() => setRestartConfirmOpen(true)}>↻ 검사 다시하기</button>
                  <DigitalContentCheckoutConsents
                    idPrefix="report-checkout"
                    customProduct
                    termsChecked={termsConsent}
                    digitalChecked={digitalConsent}
                    customChecked={customConsent}
                    onTermsChange={setTermsConsent}
                    onDigitalChange={setDigitalConsent}
                    onCustomChange={setCustomConsent}
                  />
                  <button
                    className="money-report-detail-checkout-primary"
                    type="button"
                    onClick={confirmCheckout}
                    disabled={!termsConsent || !digitalConsent || !customConsent || creatingOrder}
                  >
                    {creatingOrder ? "주문 정보 저장 중..." : couponResult?.finalAmount === 0 ? "무료로 받기" : couponResult ? `${couponResult.finalAmount.toLocaleString("ko-KR")}원 결제하기` : "신용카드로 결제하기"}
                  </button>
                  <DigitalContentRefundNotice />
                  <KakaoContactLink variant="checkout" />
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
