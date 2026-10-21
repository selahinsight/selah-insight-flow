import { createFileRoute } from "@tanstack/react-router";
import { syncPortOnePayment } from "@/lib/portone-payment.server";

export const Route = createFileRoute("/api/portone/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const event = await request.json() as {
            paymentId?: string;
            data?: { paymentId?: string };
          };
          const paymentId = event.data?.paymentId || event.paymentId;
          if (!paymentId) return Response.json({ ok: false, error: "paymentId is required" }, { status: 400 });
          const result = await syncPortOnePayment(paymentId, "webhook");
          return Response.json({ ok: true, orderNumber: result.orderNumber });
        } catch (error) {
          console.error("[Selah Money] PortOne webhook failed", error);
          return Response.json({ ok: false, error: error instanceof Error ? error.message : "webhook failed" }, { status: 500 });
        }
      },
    },
  },
});
