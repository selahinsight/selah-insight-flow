const WORKBOOK_BUCKET = "paid-content";
const WORKBOOK_PATH = "selah-money-workbook/selah-money-workbook.pdf";
const PUBLIC_SITE_URL = "https://money.selahinsight.co.kr";

type DeliveryOrder = {
  id: string;
  buyer_email: string | null;
  delivery_status: string | null;
  metadata: Record<string, unknown> | null;
};

function isWorkbookProduct(metadata: Record<string, unknown> | null | undefined) {
  return metadata?.productCode === "workbook" || metadata?.productCode === "set";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string);
}

function publicDownloadUrl(token: string) {
  const baseUrl = process.env.PUBLIC_SITE_URL?.trim() || PUBLIC_SITE_URL;
  return `${baseUrl}/api/workbook/download?token=${encodeURIComponent(token)}`;
}

async function ensureDownloadToken(order: DeliveryOrder) {
  const existing = typeof order.metadata?.downloadToken === "string"
    ? order.metadata.downloadToken
    : "";
  if (existing) return existing;

  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const metadata = { ...(order.metadata || {}), downloadToken: token };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("orders").update({ metadata }).eq("id", order.id);
  if (error) throw new Error(`다운로드 권한 저장 실패: ${error.message}`);
  order.metadata = metadata;
  return token;
}

async function sendDeliveryEmail(order: DeliveryOrder, downloadUrl: string) {
  if (!order.buyer_email) return "missing_email" as const;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESULT_EMAIL_FROM?.trim();
  if (!apiKey || !from) return "not_configured" as const;

  const safeUrl = escapeHtml(downloadUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [order.buyer_email],
      subject: "[셀라인사이트] 셀라 머니 워크북 다운로드 안내",
      html: `<!doctype html><html lang="ko"><body style="margin:0;background:#f7f4ee;color:#3a2f27;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><main style="max-width:560px;margin:0 auto;padding:36px 24px;background:#fff"><p style="margin:0 0 10px;color:#9a7664;font-size:12px;letter-spacing:.16em">SELAH MONEY WORKBOOK</p><h1 style="margin:0 0 18px;font-size:24px;line-height:1.45">워크북이 준비되었습니다.</h1><p style="margin:0 0 24px;font-size:15px;line-height:1.8">아래 버튼을 눌러 셀라 머니 워크북 PDF를 열고 저장해주세요.</p><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#8b5e55;color:#fff;font-size:15px;font-weight:700;text-decoration:none">워크북 다운로드</a><p style="margin:24px 0 0;color:#766257;font-size:12px;line-height:1.7">버튼이 열리지 않으면 다음 주소를 복사해 브라우저에서 열어주세요.<br><a href="${safeUrl}" style="color:#8b5e55;word-break:break-all">${safeUrl}</a></p></main></body></html>`,
      text: `셀라 머니 워크북이 준비되었습니다.\n\n다운로드: ${downloadUrl}\n\n링크를 브라우저에서 열어 PDF를 저장해주세요.`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`워크북 이메일 발송 실패 (${response.status}): ${body.slice(0, 300)}`);
  }
  return "sent" as const;
}

export async function provisionWorkbookDelivery(order: DeliveryOrder) {
  if (!isWorkbookProduct(order.metadata)) return null;

  const token = await ensureDownloadToken(order);
  const downloadUrl = publicDownloadUrl(token);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const currentStatus = order.delivery_status || "pending";
  let emailStatus = currentStatus;
  const claimable = ["pending", "failed", "not_configured"].includes(currentStatus);

  if (claimable) {
    const { data: claimed } = await supabaseAdmin
      .from("orders")
      .update({ delivery_status: "sending", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("delivery_status", currentStatus)
      .select("id")
      .maybeSingle();

    if (claimed) {
      try {
        const emailStatus = await sendDeliveryEmail(order, downloadUrl);
        const delivered = emailStatus === "sent";
        order.delivery_status = emailStatus;
        await supabaseAdmin.from("orders").update({
          delivery_status: delivered ? "sent" : emailStatus,
          delivered_at: delivered ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("id", order.id);
      } catch (error) {
        order.delivery_status = "failed";
        console.error("[Selah Money] Workbook delivery email failed", error);
        await supabaseAdmin.from("orders").update({
          delivery_status: "failed",
          failure_message: error instanceof Error ? error.message.slice(0, 500) : "워크북 이메일 발송 실패",
          updated_at: new Date().toISOString(),
        }).eq("id", order.id);
      }
    }
  }

  emailStatus = order.delivery_status || emailStatus;
  return { downloadUrl, emailStatus };
}

export async function createWorkbookSignedUrl(token: string) {
  if (!/^[a-f0-9]{32,128}$/i.test(token)) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id, status, payment_status, metadata")
    .contains("metadata", { downloadToken: token })
    .limit(1);
  if (error || !orders?.length) return null;

  const order = orders[0];
  const paid = order.status === "paid" && order.payment_status === "paid";
  if (!paid || !isWorkbookProduct(order.metadata as Record<string, unknown>)) return null;

  const { data, error: signError } = await supabaseAdmin.storage
    .from(WORKBOOK_BUCKET)
    .createSignedUrl(WORKBOOK_PATH, 120, { download: "Selah-Money-Workbook.pdf" });
  if (signError || !data?.signedUrl) throw new Error("워크북 다운로드 주소를 만들지 못했습니다.");
  return data.signedUrl;
}

