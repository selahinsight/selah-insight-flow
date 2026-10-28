import { KakaoContactLink } from "./SelahKakaoContact";

type WorkbookDeliverySuccessProps = {
  downloadUrl: string;
  includesReport?: boolean;
  emailSent?: boolean;
  onClose: () => void;
};

export function WorkbookDeliverySuccess({ downloadUrl, includesReport = false, emailSent = false, onClose }: WorkbookDeliverySuccessProps) {
  return (
    <div className="workbook-delivery-success" role="dialog" aria-modal="true" aria-label="결제 완료">
      <div>
        <span>PAYMENT COMPLETE</span>
        <h2>결제가 완료되었습니다.</h2>
        <p>셀라 머니 워크북을 지금 다운로드할 수 있습니다.</p>
        <a href={downloadUrl}>워크북 다운로드</a>
        <small>
          {emailSent ? "입력하신 이메일로도 다운로드 링크를 보내드렸습니다." : "아래 다운로드 버튼은 결제 확인이 완료된 고객만 이용할 수 있습니다."}
          {includesReport && <><br />맞춤 리포트는 24시간 이내 이메일로 보내드립니다.</>}
        </small>
        <KakaoContactLink variant="checkout" />
        <button type="button" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
