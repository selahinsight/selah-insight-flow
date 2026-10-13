import { createFileRoute } from "@tanstack/react-router";
import { MoneyPolicyLayout } from "../components/MoneyPolicyLayout";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "취소·환불 규정 | Selah Insight" },
      { name: "description", content: "셀라 인사이트 디지털 콘텐츠의 취소·환불 규정입니다." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <MoneyPolicyLayout title="취소·환불 규정">
      <section>
        <h2>1. 워크북</h2>
        <ul>
          <li>디지털 워크북의 공급이 시작되기 전에는 결제를 취소할 수 있습니다.</li>
          <li>결제 후 즉시 다운로드가 제공되는 상품으로, 구매자가 사전에 즉시 제공 및 공급 개시 후 청약철회 제한에 동의하고 다운로드가 제공된 경우 단순 변심에 따른 청약철회가 제한될 수 있습니다.</li>
          <li>파일 오류, 다운로드 불가, 상품 설명과 다른 내용이 제공된 경우에는 정상 파일을 재제공하거나 환불합니다.</li>
        </ul>
      </section>
      <section>
        <h2>2. 맞춤형 리포트</h2>
        <ul>
          <li>맞춤형 리포트 제작이 시작되기 전에는 결제를 취소할 수 있습니다.</li>
          <li>구매자가 제출한 정보를 바탕으로 개별 제작이 시작된 이후에는 단순 변심에 따른 취소·환불이 제한될 수 있습니다.</li>
          <li>회사의 귀책사유로 약정된 기간 내 리포트가 제공되지 않거나 상품 설명과 현저히 다른 결과물이 제공된 경우 재제작 또는 환불을 요청할 수 있습니다.</li>
        </ul>
      </section>
      <section>
        <h2>3. 세트 상품</h2>
        <ul>
          <li>세트 상품 전체가 제공되기 전에는 제공되지 않은 구성품에 대해 부분 환불을 요청할 수 있습니다.</li>
          <li><strong>일부 구성품이 이미 제공된 경우, 세트 결제금액에서 제공된 구성품의 할인 전 개별 판매가를 차감한 금액을 환불합니다.</strong></li>
          <li>계산된 환불금액이 0원 이하인 경우 부분 환불금액은 없습니다.</li>
          <li>오류·미제공 등 회사의 귀책사유가 있는 경우에는 해당 구성품을 재제공하거나 관계 법령에 따라 환불합니다.</li>
        </ul>
      </section>
      <section>
        <h2>4. 환불 신청 방법</h2>
        <p>환불을 요청할 때는 다음 정보를 <a href="mailto:contact@selahinsight.co.kr">contact@selahinsight.co.kr</a>로 보내주시기 바랍니다.</p>
        <ul>
          <li>구매자 이름</li>
          <li>결제일</li>
          <li>주문번호 또는 결제정보</li>
          <li>구매 상품명</li>
          <li>취소·환불 사유</li>
        </ul>
      </section>
      <section>
        <h2>5. 환불 처리</h2>
        <p>회사는 환불 사유와 상품 제공 여부를 확인한 후 결과를 안내합니다. 환불이 승인된 경우 승인일로부터 3영업일 이내 기존 결제수단으로 환불하며, 카드사 또는 결제기관의 처리 일정에 따라 실제 환급 시점은 달라질 수 있습니다.</p>
      </section>
      <section>
        <h2>6. 법령 우선 적용</h2>
        <p>본 규정에서 정하지 않은 사항 또는 본 규정과 관계 법령이 충돌하는 경우 전자상거래 등에서의 소비자보호에 관한 법률 등 관계 법령을 우선 적용합니다.</p>
      </section>
    </MoneyPolicyLayout>
  );
}
