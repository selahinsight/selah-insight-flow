type PortOnePayment = {
  id: string;
  transactionId?: string;
  status: string;
  totalAmount: number;
  currency: string;
  paidAt?: string;
  cancelledAt?: string;
  method?: { type?: string; provider?: string };
  cancellations?: Array<{ totalAmount?: number; cancelledAt?: string }>;
};

function getPortOneApiSecret() {
  const secret = process.env.PORTONE_API_SECRET?.trim();
  if (!secret) throw new Error("PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.");
  return secret;
}

async function fetchPortOnePayment(paymentId: string): Promise<PortOnePayment> {
  const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${getPortOneApiSecret()}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`포트원 결제 조회 실패 (${response.status}): ${body.slice(0, 300)}`);
  }
  return response.json() as Promise<PortOnePayment>;
}

export async function syncPortOnePayment(paymentId: string, source: "browser" | "webhook") {
  const [{ supabaseAdmin }, payment] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    fetchPortOnePayment(paymentId),
  ]);

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, amount_krw, status, payment_status")
    .eq("external_payment_id", paymentId)
    .maybeSingle();

  if (orderError || !order) {
    throw new Error("결제와 일치하는 주문을 찾지 못했습니다.");
  }

  const amountMatches = payment.totalAmount === order.amount_krw && payment.currency === "KRW";
  const paymentStatus = payment.status.toUpperCase();
  const cancelledAmount = (payment.cancellations || []).reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const now = new Date().toISOString();

  let status = order.status || "pending_payment";
  if (!amountMatches) status = "pending_manual_check";
  else if (paymentStatus === "PAID") {
    status = cancelledAmount >= order.amount_krw
      ? "refunded"
      : cancelledAmount > 0
        ? "partially_refunded"
        : "paid";
  }
  else if (paymentStatus === "PARTIAL_CANCELLED") status = "partially_refunded";
  else if (paymentStatus === "CANCELLED") status = order.payment_status === "paid" ? "refunded" : "cancelled";
  else if (paymentStatus === "FAILED") status = "failed";

  const paid = amountMatches && paymentStatus === "PAID" && cancelledAmount === 0;
  const update = {
    status,
    payment_status: !amountMatches
      ? "amount_mismatch"
      : cancelledAmount >= order.amount_krw
        ? "refunded"
        : cancelledAmount > 0
          ? "partially_refunded"
          : paymentStatus.toLowerCase(),
    external_payment_id: payment.id,
    portone_transaction_id: payment.transactionId || null,
    payment_provider: payment.method?.provider || "NHN_KCP",
    payment_method: payment.method?.type || null,
    paid_at: payment.paidAt || null,
    cancelled_at: payment.cancelledAt || payment.cancellations?.at(-1)?.cancelledAt || null,
    refunded_at: cancelledAmount >= order.amount_krw ? (payment.cancelledAt || now) : null,
    refund_amount_krw: cancelledAmount,
    failure_code: amountMatches ? null : "AMOUNT_MISMATCH",
    failure_message: amountMatches ? null : `주문금액 ${order.amount_krw}원 / 결제금액 ${payment.totalAmount} ${payment.currency}`,
    updated_at: now,
  };

  const { error: updateError } = await supabaseAdmin.from("orders").update(update).eq("id", order.id);
  if (updateError) throw new Error(`주문 상태 저장 실패: ${updateError.message}`);

  await supabaseAdmin.from("payment_events").upsert({
    order_id: order.id,
    provider_event_id: `${source}:${payment.transactionId || payment.id}:${paymentStatus}:${cancelledAmount}`,
    event_type: paymentStatus,
    payment_id: payment.id,
    payload: JSON.parse(JSON.stringify(payment)),
    processed_at: now,
  }, { onConflict: "provider_event_id", ignoreDuplicates: true });

  if (source === "browser" && !amountMatches) {
    throw new Error("결제 금액이 주문 금액과 일치하지 않아 자동 승인을 보류했습니다.");
  }
  if (source === "browser" && !paid) throw new Error(`결제 상태가 완료가 아닙니다: ${paymentStatus}`);

  return { verified: paid, orderId: order.id, orderNumber: order.order_number, status };
}
