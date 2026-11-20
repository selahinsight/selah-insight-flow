import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MONEY_PRODUCTS } from "@/lib/money-products";
import { syncPortOnePayment } from "@/lib/portone-payment.server";
import { resolveMoneyCoupon } from "@/lib/coupon.functions";
import { customerFaithResultTitle, resolveSelahMoneyResultTitle } from "@/lib/selah-money-results";
import { loadStoredSurveyResultInternal } from "@/lib/studio-result-access.functions";

const createMoneyOrderInput = z.object({
  productCode: z.enum(["report", "workbook", "set"]),
  email: z.string().trim().email().max(254),
  customerName: z.string().trim().max(100).optional().nullable(),
  surveyResponseId: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional()
    .nullable(),
  moneyType: z.string().trim().max(100).optional().nullable(),
  faithType: z.string().trim().max(100).optional().nullable(),
  refundConsentAt: z.string().datetime({ offset: true }),
  sourcePath: z.string().trim().max(200).optional(),
  couponCode: z.string().trim().max(40).optional().nullable(),
  couponPhone: z.string().trim().max(30).optional().nullable(),
});

function createOrderNumber(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  return `SEL-${date}-${random}`;
}

async function findOrCreateCustomerByExactEmail(
  supabaseAdmin: any,
  email: string,
  customerName: string | null,
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const customers = (supabaseAdmin as any).from("customers");
  const findExact = async () => {
    const { data, error } = await customers
      .select("id, email, created_at")
      .ilike("email", normalizedEmail)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw new Error("기존 고객 연결을 확인하지 못했습니다.");
    return (data || []).find((row: { email?: string | null }) =>
      String(row.email || "").trim().toLowerCase() === normalizedEmail
    );
  };

  const existing = await findExact();
  if (existing?.id) return String(existing.id);

  const { data, error } = await customers
    .insert({
      display_name: customerName?.trim() || null,
      email: normalizedEmail,
      source_key: "selah-money-checkout",
    })
    .select("id")
    .single();
  if (!error && data?.id) return String(data.id);

  // If two checkouts created the same email at once, reuse the winner.
  const raced = await findExact();
  if (raced?.id) return String(raced.id);
  console.error("[Selah Money] Failed to link checkout customer", { code: error?.code || null });
  throw new Error("고객 정보를 연결하지 못했습니다. 잠시 후 다시 시도해주세요.");
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

    const orderProductCodes = data.productCode === "report"
      ? ["paid_diagnosis_report"]
      : data.productCode === "workbook"
        ? ["workbook_package"]
        : ["paid_diagnosis_report", "workbook_package"];
    const { data: orderProducts, error: orderProductsError } = await supabaseAdmin
      .from("products")
      .select("id, code")
      .in("code", orderProductCodes);
    if (orderProductsError || !orderProductCodes.every((code) => orderProducts?.some((row) => row.code === code))) {
      console.error("[Selah Money] Failed to resolve order product mapping", { code: orderProductsError?.code || null });
      throw new Error("상품 연결 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
    const productIds = Object.fromEntries((orderProducts || []).map((row) => [row.code, row.id]));

    let verifiedCustomerName = data.customerName || null;
    let verifiedMoneyType = data.moneyType || null;
    let verifiedFaithType = data.faithType || null;
    if (data.productCode === "report") {
      if (!data.surveyResponseId) throw new Error("연결된 진단 결과를 확인하지 못했습니다. 진단 결과 화면에서 다시 시작해주세요.");
      const stored = await loadStoredSurveyResultInternal(data.surveyResponseId);
      const diagnosis = stored.answers.__diagnosis_result && typeof stored.answers.__diagnosis_result === "object"
        ? stored.answers.__diagnosis_result as Record<string, unknown>
        : {};
      const moneyType = resolveSelahMoneyResultTitle([
        String(diagnosis.moneyResultCode || ""),
        stored.resultTypeId,
        stored.primaryMoneyTypeId,
      ]);
      const faithType = resolveSelahMoneyResultTitle([
        String(diagnosis.faithResultCode || ""),
        stored.primaryFaithLensId,
      ]);
      if (stored.responseId !== data.surveyResponseId || !stored.name || !moneyType || !faithType) {
        throw new Error("저장된 진단 결과 연결을 확인하지 못했습니다.");
      }
      verifiedCustomerName = stored.name;
      verifiedMoneyType = moneyType.title;
      verifiedFaithType = customerFaithResultTitle(faithType.id, faithType.title);
    }

    const coupon = data.couponCode
      ? await resolveMoneyCoupon(data.couponCode, data.productCode, studioProduct.price_krw, data.couponPhone || "")
      : null;
    if (coupon && !coupon.valid) throw new Error(coupon.message);
    const finalAmount = coupon?.valid ? coupon.finalAmount : studioProduct.price_krw;

    const freeOrder = finalAmount === 0;
    const now = new Date().toISOString();
    // Workbook-only purchases have no diagnosis response ID for the Studio
    // customer-linking trigger, so connect them to an exact-email customer here.
    // Bundles keep response identity as the primary link when one is available.
    const customerId = data.productCode === "workbook" || (data.productCode === "set" && !data.surveyResponseId)
      ? await findOrCreateCustomerByExactEmail(supabaseAdmin, data.email, verifiedCustomerName)
      : null;
    const orderMetadata = {
      sourcePath: data.sourcePath || null,
      surveyResponseId: data.surveyResponseId || null,
      survey_response_id: data.surveyResponseId || null,
      result_number: data.surveyResponseId || null,
      moneyType: verifiedMoneyType,
      faithType: verifiedFaithType,
      productCode: product.code,
      product_codes: orderProductCodes,
      product_ids: productIds,
      downloadToken: product.code === "workbook" || product.code === "set"
        ? crypto.randomUUID().replaceAll("-", "")
        : null,
      originalAmount: studioProduct.price_krw,
      couponId: coupon?.valid ? coupon.couponId : null,
      couponCode: coupon?.valid ? coupon.code : null,
      couponDiscountRate: coupon?.valid ? coupon.discountRate : null,
      couponDiscountAmount: coupon?.valid ? coupon.discountAmount : 0,
    };
    const orderRecord = {
      ...(customerId ? { customer_id: customerId } : {}),
      order_number: orderNumber,
      product_id: studioProduct.id,
      amount_krw: finalAmount,
      buyer_email: data.email.toLowerCase(),
      buyer_name: verifiedCustomerName,
      buyer_phone: coupon?.valid ? coupon.phone : null,
      refund_consent_at: data.refundConsentAt,
      requested_at: now,
      status: freeOrder ? "paid" : "pending_payment",
      payment_status: freeOrder ? "paid" : "pending",
      external_payment_id: orderNumber,
      payment_provider: freeOrder ? "coupon" : null,
      payment_method: freeOrder ? "coupon" : null,
      paid_at: freeOrder ? now : null,
      metadata: orderMetadata,
    };
    // customer_id is present in the shared Studio schema but predates this
    // check-out repo's generated Supabase types.
    const { data: order, error } = await (supabaseAdmin as any)
      .from("orders")
      .insert(orderRecord)
      .select("id, order_number, amount_krw, buyer_email, status, created_at")
      .single();

    if (error || !order) {
      console.error("[Selah Money] Failed to create order", error);
      throw new Error("주문 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }

    let delivery: { downloadUrl: string; emailStatus: string } | null = null;
    if (freeOrder && (data.productCode === "workbook" || data.productCode === "set")) {
      const { provisionWorkbookDelivery } = await import("@/lib/workbook-delivery.server");
      delivery = await provisionWorkbookDelivery({
        id: order.id,
        buyer_email: order.buyer_email,
        delivery_status: "pending",
        metadata: orderMetadata,
      });
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
      customerPhone: coupon?.valid ? coupon.phone : null,
      status: order.status,
      createdAt: order.created_at,
      ...(delivery ? { deliveryEmailStatus: delivery.emailStatus, downloadUrl: delivery.downloadUrl } : {}),
    };
  });

const verifyMoneyPaymentInput = z.object({
  paymentId: z.string().trim().min(1).max(80),
});

export const verifyMoneyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => verifyMoneyPaymentInput.parse(data))
  .handler(async ({ data }) => syncPortOnePayment(data.paymentId, "browser"));

