import { createFileRoute } from "@tanstack/react-router";
import { createWorkbookSignedUrl } from "@/lib/workbook-delivery.server";

export const Route = createFileRoute("/api/workbook/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token") || "";
        try {
          const signedUrl = await createWorkbookSignedUrl(token);
          if (!signedUrl) return new Response("유효한 결제 정보를 확인할 수 없습니다.", { status: 403 });
          return Response.redirect(signedUrl, 302);
        } catch (error) {
          console.error("[Selah Money] Workbook download failed", error);
          return new Response("워크북 다운로드를 준비하지 못했습니다. 잠시 후 다시 시도해주세요.", { status: 500 });
        }
      },
    },
  },
});
