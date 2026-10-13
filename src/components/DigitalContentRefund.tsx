type RefundNoticeProps = {
  bundle?: boolean;
  className?: string;
  label?: string;
};

type CheckoutConsentsProps = {
  customChecked?: boolean;
  customProduct?: boolean;
  digitalChecked: boolean;
  idPrefix: string;
  onCustomChange?: (checked: boolean) => void;
  onDigitalChange: (checked: boolean) => void;
  onTermsChange: (checked: boolean) => void;
  termsChecked: boolean;
};

export const DIGITAL_CONTENT_REFUND_NOTICE =
  "본 상품은 디지털 콘텐츠입니다. 다운로드 또는 열람이 시작된 후에는 단순 변심에 따른 청약철회가 제한됩니다. 콘텐츠 미제공, 파일 오류 또는 상품 설명과 다른 경우에는 재제공 또는 환불해 드립니다.";

export const BUNDLE_PARTIAL_REFUND_NOTICE =
  "세트상품의 일부만 환불되는 경우, 세트 결제금액에서 이미 제공된 상품의 할인 전 개별 판매가를 차감한 잔액을 환불합니다. 계산된 환불금액이 0원 이하인 경우 부분 환불금액은 없습니다.";

export function DigitalContentRefundNotice({
  bundle = false,
  className = "money-inline-refund-notice",
  label = "취소·환불 안내 보기",
}: RefundNoticeProps) {
  return (
    <details className={`money-digital-refund-notice ${className}`.trim()}>
      <summary>{label}</summary>
      <div>
        <p>{DIGITAL_CONTENT_REFUND_NOTICE}</p>
        {bundle && <p>{BUNDLE_PARTIAL_REFUND_NOTICE}</p>}
      </div>
    </details>
  );
}

export function DigitalContentCheckoutConsents({
  customChecked = false,
  customProduct = false,
  digitalChecked,
  idPrefix,
  onCustomChange,
  onDigitalChange,
  onTermsChange,
  termsChecked,
}: CheckoutConsentsProps) {
  return (
    <div className="money-digital-refund-consent">
      <label htmlFor={`${idPrefix}-terms`}>
        <input
          id={`${idPrefix}-terms`}
          type="checkbox"
          checked={termsChecked}
          onChange={(event) => onTermsChange(event.target.checked)}
        />
        <span>
          [필수] <a href="/terms" target="_blank" rel="noreferrer">이용약관</a> 및 <a href="/refund" target="_blank" rel="noreferrer">취소·환불 규정</a>에 동의합니다.
        </span>
      </label>
      <label htmlFor={`${idPrefix}-digital`}>
        <input
          id={`${idPrefix}-digital`}
          type="checkbox"
          checked={digitalChecked}
          onChange={(event) => onDigitalChange(event.target.checked)}
        />
        <span>[필수] 디지털 콘텐츠가 결제 후 즉시 제공되며, 공급이 시작된 이후에는 단순 변심에 따른 청약철회가 제한될 수 있음에 동의합니다.</span>
      </label>
      {customProduct && (
        <label htmlFor={`${idPrefix}-custom`}>
          <input
            id={`${idPrefix}-custom`}
            type="checkbox"
            checked={customChecked}
            onChange={(event) => onCustomChange?.(event.target.checked)}
          />
          <span>[필수] 맞춤형 리포트 제작이 시작된 이후에는 단순 변심에 따른 취소·환불이 제한될 수 있음에 동의합니다.</span>
        </label>
      )}
    </div>
  );
}
