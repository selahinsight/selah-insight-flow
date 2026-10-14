import { createFileRoute } from "@tanstack/react-router";
import { BusinessFooter } from "../components/BusinessFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "개인정보처리방침 | Selah Insight" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="money-legal-page-shell">
      <main className="money-legal-page">
        <header className="money-legal-header">
          <a href="/">SELAH INSIGHT</a>
          <h1>개인정보처리방침</h1>
          <p>시행일: 2026년 10월 13일</p>
        </header>
        <div className="money-legal-content">
          <p>셀라 인사이트는 이용자의 개인정보를 안전하게 관리합니다.</p>
          <section>
            <h2>수집하는 개인정보 및 이용 목적</h2>
            <ul>
              <li>진단 서비스: 이름, 이메일 주소, 진단 응답 내용 / 진단 결과 제공 및 서비스 운영</li>
              <li>상품 구매: 이름, 이메일 주소, 휴대전화번호, 주문 및 결제 정보 / 주문 확인, 결제 처리, 디지털 콘텐츠 제공, 환불 및 고객 문의 처리</li>
              <li>문의 접수: 이름, 이메일 주소, 문의 내용 / 문의 확인 및 답변</li>
            </ul>
            <p>결제 과정에서 카드번호 등 결제수단 정보는 결제대행사가 직접 처리하며, 셀라 인사이트가 직접 저장하지 않습니다.</p>
          </section>
          <section>
            <h2>보유 및 이용 기간</h2>
            <p>개인정보는 수집·이용 목적이 달성되면 지체 없이 파기합니다. 다만 관계 법령에 따라 다음 기간 동안 보관할 수 있습니다.</p>
            <ul>
              <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
              <li>대금결제 및 재화·서비스 공급에 관한 기록: 5년</li>
              <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
              <li>웹사이트 접속기록: 3개월</li>
            </ul>
          </section>
          <section>
            <h2>개인정보 처리위탁</h2>
            <p>셀라 인사이트는 원활한 결제 처리를 위해 다음과 같이 개인정보 처리업무를 위탁할 수 있습니다.</p>
            <ul>
              <li>수탁업체: 엔에이치엔케이씨피 주식회사(NHN KCP)</li>
              <li>위탁업무: 신용카드 등 전자결제 처리, 결제 확인, 결제 취소 및 환불</li>
              <li>보유기간: 위탁계약 종료 시 또는 관계 법령에서 정한 보존기간까지</li>
            </ul>
          </section>
          <section>
            <h2>이용자의 권리</h2>
            <p>이용자는 자신의 개인정보에 대해 열람, 정정, 삭제 또는 처리정지를 요청할 수 있습니다. 관련 요청은 아래 개인정보 보호책임자에게 이메일 또는 전화로 접수할 수 있으며, 셀라 인사이트는 관계 법령에 따라 지체 없이 처리합니다.</p>
          </section>
          <section>
            <h2>개인정보 보호책임자</h2>
            <ul>
              <li>개인정보 보호책임자: 최성윤</li>
              <li>이메일: <a href="mailto:contact@selahinsight.co.kr">contact@selahinsight.co.kr</a></li>
              <li>전화: <a href="tel:07080648059">070-8064-8059</a></li>
            </ul>
          </section>
        </div>
        <BusinessFooter />
      </main>
    </div>
  );
}
