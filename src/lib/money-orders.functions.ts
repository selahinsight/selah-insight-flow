import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MONEY_PRODUCTS } from "@/lib/money-products";
import { syncPortOnePayment } from "@/lib/portone-payment.server";

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

    const { data: studioProduct, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, code, name, price_krw, active")
      .eq("code", product.studioCode)
      .eq("active", true)
      .maybeSingle();

    if (productError || !studioProduct || studioProduct.price_krw <= 0) {
      console.error("[Selah Money] Failed to load active product", productError);
      throw new Error("판매 상품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        product_id: studioProduct.id,
        amount_krw: studioProduct.price_krw,
        buyer_email: data.email.toLowerCase(),
        buyer_name: data.customerName || null,
        refund_consent_at: data.refundConsentAt,
        requested_at: new Date().toISOString(),
        status: "pending_payment",
        payment_status: "pending",
        external_payment_id: orderNumber,
        metadata: {
          sourcePath: data.sourcePath || null,
          surveyResponseId: data.surveyResponseId || null,
          moneyType: data.moneyType || null,
          faithType: data.faithType || null,
          productCode: product.code,
        },
      })
      .select("id, order_number, amount_krw, buyer_email, status, created_at")
      .single();

    if (error || !order) {
      console.error("[Selah Money] Failed to create order", error);
      throw new Error("주문 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }

    return {
      orderId: order.id,
      orderNumber,
      paymentId: orderNumber,
      productCode: product.code,
      productName: studioProduct.name,
      amount: order.amount_krw,
      currency: "KRW",
      customerEmail: data.email.toLowerCase(),
      status: order.status,
      createdAt: order.created_at,
    };
  });

const verifyMoneyPaymentInput = z.object({
  paymentId: z.string().trim().min(1).max(80),
});

export const verifyMoneyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => verifyMoneyPaymentInput.parse(data))
  .handler(async ({ data }) => syncPortOnePayment(data.paymentId, "browser"));

