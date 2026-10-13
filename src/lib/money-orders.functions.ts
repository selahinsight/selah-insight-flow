import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MONEY_PRODUCTS } from "@/lib/money-products";

const createMoneyOrderInput = z.object({
  productCode: z.enum(["report", "workbook", "set"]),
  email: z.string().trim().email().max(254),
  customerName: z.string().trim().max(100).optional().nullable(),
  surveyResponseId: z.string().uuid().optional().nullable(),
  moneyType: z.string().trim().max(100).optional().nullable(),
  faithType: z.string().trim().max(100).optional().nullable(),
  refundConsentAt: z.string().datetime({ offset: true }),
  sourcePath: z.string().trim().max(200).optional(),
});

function createOrderNumber(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  return `SEL-${date}-${random}`;
}

export const createMoneyOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createMoneyOrderInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const product = MONEY_PRODUCTS[data.productCode];
    const orderNumber = createOrderNumber();

    const { data: order, error } = await supabaseAdmin
      .from("money_orders")
      .insert({
        order_number: orderNumber,
        product_code: product.code,
        product_name: product.name,
        amount: product.amount,
        currency: product.currency,
        customer_email: data.email.toLowerCase(),
        customer_name: data.customerName || null,
        survey_response_id: data.surveyResponseId || null,
        money_type: data.moneyType || null,
        faith_type: data.faithType || null,
        refund_consent_at: data.refundConsentAt,
        status: "pending",
        portone_payment_id: orderNumber,
        metadata: { sourcePath: data.sourcePath || null },
      })
      .select("id, order_number, product_code, product_name, amount, currency, customer_email, status, created_at")
      .single();

    if (error || !order) {
      console.error("[Selah Money] Failed to create order", error);
      throw new Error("주문 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentId: order.order_number,
      productCode: order.product_code,
      productName: order.product_name,
      amount: order.amount,
      currency: order.currency,
      customerEmail: order.customer_email,
      status: order.status,
      createdAt: order.created_at,
    };
  });

