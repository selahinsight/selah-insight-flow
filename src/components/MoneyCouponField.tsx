import { useState } from "react";
import { validateMoneyCoupon } from "../lib/coupon.functions";

export type AppliedMoneyCoupon = {
  code: string;
  phone: string;
  discountRate: number | null;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
};

export function MoneyCouponField({
  productCode,
  onChange,
}: {
  productCode: "report" | "workbook" | "set";
  onChange: (coupon: AppliedMoneyCoupon | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [applying, setApplying] = useState(false);
  const [coupon, setCoupon] = useState<AppliedMoneyCoupon | null>(null);
  const [message, setMessage] = useState("");

  async function applyCoupon() {
    if (coupon) {
      setCoupon(null);
      setMessage("");
      onChange(null);
      return;
    }
    if (!code.trim()) {
      setMessage("쿠폰 코드를 입력해주세요.");
      return;
    }
    const normalizedPhone = phone.replace(/\D/g, "");
    if (!/^010\d{8}$/.test(normalizedPhone)) {
      setMessage("휴대폰번호를 정확히 입력해주세요.");
      return;
    }
    setApplying(true);
    setMessage("");
    try {
      const result = await validateMoneyCoupon({ data: { code, productCode, phone: normalizedPhone } });
      if (!result.valid) {
        setMessage(result.message);
        return;
      }
      setCode(result.code);
      setCoupon(result);
      setMessage("쿠폰이 적용되었습니다.");
      onChange(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "쿠폰을 확인하지 못했습니다.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="money-checkout-coupon" aria-label="할인쿠폰">
      <button className="money-checkout-coupon-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>쿠폰이 있으신가요?</span><span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="money-checkout-coupon-body">
          <label className="money-checkout-coupon-phone-label">
            휴대폰번호
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.replace(/[^0-9-]/g, ""));
                setCoupon(null);
                setMessage("");
                onChange(null);
              }}
              placeholder="010-1234-5678"
              maxLength={13}
            />
          </label>
          <div className="money-checkout-coupon-form">
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setCoupon(null);
                setMessage("");
                onChange(null);
              }}
              placeholder="쿠폰 코드 입력"
              maxLength={40}
            />
            <button type="button" onClick={applyCoupon} disabled={applying}>{coupon ? "취소" : applying ? "확인 중" : "적용"}</button>
          </div>
          <p className="money-checkout-coupon-notice">본 쿠폰은 휴대폰번호당 1회 사용할 수 있습니다.</p>
          {message && <p className={coupon ? "money-checkout-coupon-success" : "money-checkout-coupon-error"}>{message}</p>}
          {coupon && (
            <dl className="money-checkout-price-summary">
              <div><dt>상품금액</dt><dd>{coupon.originalAmount.toLocaleString("ko-KR")}원</dd></div>
              <div className="money-checkout-price-discount"><dt>쿠폰 할인{coupon.discountRate ? ` (${coupon.discountRate}%)` : ""}</dt><dd>-{coupon.discountAmount.toLocaleString("ko-KR")}원</dd></div>
              <div className="money-checkout-price-total"><dt>최종 결제금액</dt><dd>{coupon.finalAmount.toLocaleString("ko-KR")}원</dd></div>
            </dl>
          )}
        </div>
      )}
    </section>
  );
}
