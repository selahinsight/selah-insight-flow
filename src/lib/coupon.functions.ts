import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MONEY_PRODUCTS } from "@/lib/money-products";

const couponInput = z.object({
  code: z.string().trim().min(1).max(40),
  productCode: z.enum(["report", "workbook", "set"]),
  phone: z.string().trim().max(30),
});

type CouponContent = {
  kind?: string;
  code?: string;
  productCode?: string;
  productCodes?: string[];
  discountRate?: number;
  discountAmount?: number;
  maxUses?: number | null;
};

type CouponOrderMetadata = {
  productCode?: string;
  couponUsageCancelledAt?: string | null;
};

function productEntitlements(productCode?: string) {
  if (productCode === "set") return ["report", "workbook"];
  if (productCode === "workbook") return ["workbook"];
  return ["report"];
}

function isActiveCouponUsage(metadata: CouponOrderMetadata | null | undefined) {
  return !metadata?.couponUsageCancelledAt;
}

function usesAnyEntitlement(metadata: CouponOrderMetadata | null | undefined, requestedProductCode: string) {
  const previous = new Set(productEntitlements(metadata?.productCode));
  return productEntitlements(requestedProductCode).some((entitlement) => previous.has(entitlement));
}

export async function resolveMoneyCoupon(
  code: string,
  productCode: "report" | "workbook" | "set",
  originalAmount: number,
  phone: string,
) {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return { valid: false as const, message: "쿠폰 코드를 입력해주세요." };
  const normalizedPhone = phone.replace(/\D/g, "");
  if (!/^010\d{8}$/.test(normalizedPhone)) {
    return { valid: false as const, message: "휴대폰번호를 정확히 입력해주세요." };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // studio_surveys is maintained by Selah Studio and is not part of this app's generated DB types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coupon, error } = await (supabaseAdmin as any)
    .from("studio_surveys")
    .select("id, title, status, content")
    .like("slug", "coupon--%")
    .eq("title", normalizedCode)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[Selah Money] Coupon lookup failed", error);
    throw new Error("쿠폰을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!coupon) return { valid: false as const, message: "사용할 수 없는 쿠폰입니다." };

  const content = (coupon.content || {}) as CouponContent;
  const discountRate = Math.floor(Number(content.discountRate || 0));
  const legacyDiscountAmount = Math.floor(Number(content.discountAmount || 0));
  const discountAmount = discountRate > 0 && discountRate <= 100
    ? Math.floor(originalAmount * discountRate / 100)
    : legacyDiscountAmount;
  const maxUses = content.maxUses == null ? null : Math.floor(Number(content.maxUses));
  const applicableProductCodes = Array.isArray(content.productCodes) && content.productCodes.length
    ? content.productCodes
    : [content.productCode || "report"];
  if (content.kind !== "coupon" || !applicableProductCodes.includes(productCode) || discountAmount <= 0) {
    return { valid: false as const, message: "이 상품에는 사용할 수 없는 쿠폰입니다." };
  }
  if (discountAmount > originalAmount) {
    return { valid: false as const, message: "현재 결제금액에는 사용할 수 없는 쿠폰입니다." };
  }

  const { data: phoneUses, error: phoneUseError } = await supabaseAdmin
    .from("orders")
    .select("metadata")
    .eq("buyer_phone", normalizedPhone)
    .contains("metadata", { couponId: coupon.id })
    .in("status", ["paid", "delivered"]);
  if (phoneUseError) {
    console.error("[Selah Money] Coupon phone usage lookup failed", phoneUseError);
    throw new Error("쿠폰 사용 가능 여부를 확인하지 못했습니다.");
  }
  const hasUsedRequestedProduct = (phoneUses || []).some((order) => {
    const metadata = (order.metadata || {}) as CouponOrderMetadata;
    return isActiveCouponUsage(metadata) && usesAnyEntitlement(metadata, productCode);
  });
  if (hasUsedRequestedProduct) {
    return { valid: false as const, message: "이미 이 휴대폰번호로 해당 상품에 사용한 쿠폰입니다." };
  }

  if (maxUses && maxUses > 0) {
    const { data: couponUses, error: countError } = await supabaseAdmin
      .from("orders")
      .select("metadata")
      .contains("metadata", { couponId: coupon.id })
      .in("status", ["paid", "delivered"]);
    if (countError) {
      console.error("[Selah Money] Coupon usage lookup failed", countError);
      throw new Error("쿠폰 사용 가능 여부를 확인하지 못했습니다.");
    }
    const activeUseCount = (couponUses || []).filter((order) =>
      isActiveCouponUsage((order.metadata || {}) as CouponOrderMetadata),
    ).length;
    if (activeUseCount >= maxUses) {
      return { valid: false as const, message: "쿠폰 사용 가능 횟수가 모두 소진되었습니다." };
    }
  }

  return {
    valid: true as const,
    couponId: coupon.id as string,
    code: normalizedCode,
    phone: normalizedPhone,
    discountRate: discountRate > 0 && discountRate <= 100 ? discountRate : null,
    discountAmount,
    originalAmount,
    finalAmount: originalAmount - discountAmount,
  };
}

export const validateMoneyCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => couponInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const product = MONEY_PRODUCTS[data.productCode];
    const { data: studioProduct, error } = await supabaseAdmin
      .from("products")
      .select("price_krw")
      .eq("code", product.studioCode)
      .eq("active", true)
      .maybeSingle();
    if (error || !studioProduct) throw new Error("상품 가격을 확인하지 못했습니다.");
    return resolveMoneyCoupon(data.code, data.productCode, studioProduct.price_krw, data.phone);
  });
