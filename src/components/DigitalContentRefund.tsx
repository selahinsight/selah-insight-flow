type RefundNoticeProps = {
  bundle?: boolean;
  className?: string;
};

type RefundConsentProps = RefundNoticeProps & {
  checked: boolean;
  id: string;
  onChange: (checked: boolean) => void;
};

export const DIGITAL_CONTENT_REFUND_NOTICE =
  "본 상품은 디지털 콘텐츠입니다. 다운로드 또는 열람이 시작된 후에는 단순 변심에 따른 청약철회가 제한됩니다. 콘텐츠 미제공, 파일 오류 또는 상품 설명과 다른 경우에는 재제공 또는 환불해 드립니다.";

export const BUNDLE_PARTIAL_REFUND_NOTICE =
  "세트상품의 일부만 환불되는 경우, 환불되지 않는 상품은 결제 당시의 개별 판매가로 재산정하며, 세트 결제금액에서 해당 금액을 차감한 잔액을 환불합니다.";

export function DigitalContentRefundNotice({ bundle = false, className = "" }: RefundNoticeProps) {
  return (
    <details className={`money-digital-refund-notice ${className}`.trim()}>
      <summary>환불안내</summary>
      <div>
        <p>{DIGITAL_CONTENT_REFUND_NOTICE}</p>
        {bundle && <p>{BUNDLE_PARTIAL_REFUND_NOTICE}</p>}
      </div>
    </details>
  );
}

export function DigitalContentRefundConsent({
  checked,
  className = "",
  id,
  onChange,
}: RefundConsentProps) {
  return (
    <div className={`money-digital-refund-consent ${className}`.trim()}>
      <label htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>[필수] 디지털 콘텐츠 제공 및 청약철회 제한에 동의합니다</span>
      </label>
    </div>
  );
}
