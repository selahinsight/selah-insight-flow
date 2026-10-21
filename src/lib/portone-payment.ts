import PortOne from "@portone/browser-sdk/v2";

export type MoneyPaymentOrder = {
  paymentId: string;
  productName: string;
  amount: number;
  currency: string;
  customerEmail: string;
};

const FALLBACK_PRODUCTS = {
  report: { productName: "셀라 머니 개인 맞춤 심층 리포트", amount: 9900 },
  workbook: { productName: "셀라 머니 워크북", amount: 29000 },
  set: { productName: "셀라 머니 심층 리포트 + 워크북 세트", amount: 34900 },
} as const;

export function createFallbackMoneyPaymentOrder(
  productCode: keyof typeof FALLBACK_PRODUCTS,
  customerEmail: string,
): MoneyPaymentOrder {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const product = FALLBACK_PRODUCTS[productCode];
  return {
    paymentId: `SEL-${date}-${random}`,
    productName: product.productName,
    amount: product.amount,
    currency: "KRW",
    customerEmail,
  };
}

export function isMissingOrderStorageConfiguration(error: unknown) {
  return error instanceof Error
    && /Missing Supabase environment variable|SUPABASE_SERVICE_ROLE_KEY/.test(error.message);
}

export async function requestMoneyPayment(
  order: MoneyPaymentOrder,
  customerName?: string | null,
) {
  const storeId = (import.meta.env.VITE_PORTONE_STORE_ID as string | undefined)?.trim();
  const channelKey = (import.meta.env.VITE_PORTONE_CHANNEL_KEY as string | undefined)?.trim();

  if (!storeId || !channelKey) {
    throw new Error("결제 연동 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
  }

  const response = await PortOne.requestPayment({
    storeId,
    channelKey,
    paymentId: order.paymentId,
    orderName: order.productName,
    totalAmount: order.amount,
    currency: order.currency as "KRW",
    payMethod: "CARD",
    productType: "DIGITAL",
    customer: {
      email: order.customerEmail,
      ...(customerName?.trim() ? { fullName: customerName.trim() } : {}),
    },
    redirectUrl: `${window.location.origin}${window.location.pathname}?paymentId=${encodeURIComponent(order.paymentId)}`,
  });

  if (!response) return { completed: false as const };
  if (response.code) {
    throw new Error(response.message || "결제가 완료되지 않았습니다.");
  }

  return { completed: true as const, paymentId: response.paymentId };
}
