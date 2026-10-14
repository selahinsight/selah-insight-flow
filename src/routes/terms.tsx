import { createFileRoute } from "@tanstack/react-router";
import { BusinessFooter } from "../components/BusinessFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "이용약관 | Selah Insight" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="money-legal-page-shell">
      <main className="money-legal-page">
        <header className="money-legal-header">
          <a href="/">SELAH INSIGHT</a>
          <h1>이용약관</h1>
          <p>시행일: 2026년 10월 13일</p>
        </header>
        <div className="money-legal-content">
          <section><h2>제1조 목적</h2><p>본 약관은 셀라(이하 “회사”)가 제공하는 디지털 콘텐츠 및 관련 서비스의 이용 조건, 결제, 취소·환불 등에 관한 사항을 정함을 목적으로 합니다.</p></section>
          <section><h2>제2조 상품 및 서비스</h2><p>회사는 다음 상품을 판매합니다.</p><ul><li>PDF 형식의 디지털 워크북</li><li>구매자의 입력 내용을 바탕으로 제작하는 맞춤형 리포트</li><li>워크북과 맞춤형 리포트로 구성된 세트 상품</li></ul><p>상품의 구성, 가격 및 제공 방법은 각 상품 상세페이지에 표시합니다.</p></section>
          <section><h2>제3조 구매 및 결제</h2><p>이용자는 상품 상세내용과 취소·환불 규정을 확인한 후 구매를 신청할 수 있습니다. 결제는 회사가 지정한 결제수단을 통해 이루어지며, 결제 처리는 엔에이치엔케이씨피 주식회사(NHN KCP)를 통해 진행됩니다.</p></section>
          <section><h2>제4조 상품 제공</h2><ul><li>워크북은 결제 완료 후 즉시 다운로드할 수 있습니다.</li><li>맞춤형 리포트는 결제 및 필수정보 제출 완료 후 24시간 이내 구매자가 입력한 이메일로 발송합니다.</li><li>세트 상품은 워크북을 결제 후 즉시 제공하고, 맞춤형 리포트는 필수정보 제출 완료 후 24시간 이내 이메일로 발송합니다.</li><li>이용자가 이메일 주소 또는 입력정보를 잘못 기재하여 발생한 지연에 대해서는 회사가 책임지지 않습니다. 다만 이용자가 정정을 요청한 경우 회사는 가능한 범위에서 재발송합니다.</li></ul></section>
          <section><h2>제5조 청약철회 및 환불</h2><p>취소·청약철회 및 환불은 별도로 게시된 <a href="/refund">취소·환불 규정</a>에 따릅니다. 관계 법령에서 달리 정한 사항이 있는 경우 해당 법령을 우선 적용합니다.</p></section>
          <section><h2>제6조 이용자의 의무</h2><p>이용자는 구매한 디지털 콘텐츠를 개인적인 용도로만 사용할 수 있으며, 회사의 사전 동의 없이 복제, 배포, 재판매, 공유 또는 공개해서는 안 됩니다.</p></section>
          <section><h2>제7조 회사의 책임</h2><p>회사의 귀책사유로 상품이 제공되지 않거나 상품 설명과 다른 콘텐츠가 제공된 경우 회사는 재제공 또는 환불 등의 조치를 합니다.</p></section>
          <section><h2>제8조 분쟁 해결</h2><p>상품 이용과 관련한 문의 및 이의 제기는 <a href="mailto:contact@selahinsight.co.kr">contact@selahinsight.co.kr</a>로 접수할 수 있습니다. 회사와 이용자 사이에 분쟁이 발생한 경우 관계 법령 및 민사소송법상 관할법원에 따릅니다.</p></section>
          <section><h2>부칙</h2><p>본 약관은 2026년 10월 13일부터 시행합니다.</p></section>
        </div>
        <BusinessFooter showPrivacy />
      </main>
    </div>
  );
}
