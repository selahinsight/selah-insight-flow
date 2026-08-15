import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const studioIntakeInput = z.object({
  email: z.string().email().optional().nullable(),
  name: z.string().optional().nullable(),
  responseId: z.string().min(1),
  surveyId: z.string().min(1),
  surveySlug: z.string().min(1),
  surveyTitle: z.string().optional().nullable(),
  answers: z.record(z.any()),
  resultTypeId: z.string().optional().nullable(),
  primaryMoneyTypeId: z.string().optional().nullable(),
  secondaryMoneyTypeId: z.string().optional().nullable(),
  primaryFaithLensId: z.string().optional().nullable(),
  privacyConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  emailContent: z.object({
    subject: z.string().min(1),
    html: z.string().min(1),
    text: z.string().min(1),
    resultImage: z.object({
      dataUrl: z.string().startsWith("data:image/png;base64,"),
      filename: z.string().min(1).max(120),
    }).optional(),
  }).optional(),
});

export const sendStudioIntake = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => studioIntakeInput.parse(data))
  .handler(async ({ data }) => {
    const endpoint =
      process.env.SELAH_STUDIO_INTAKE_URL ||
      "https://selah-studio-ivy.ivy-girl.chatgpt.site/api/intake/survey-response";
    const secret =
      process.env.SELAH_STUDIO_WEBHOOK_SECRET ||
      process.env.INBOUND_WEBHOOK_SECRET;

    if (!secret) {
      return { status: "not_configured" as const };
    }

    const url = new URL(endpoint);
    url.searchParams.set("source", data.surveySlug);
    url.searchParams.set("provider", "selah-insight-flow");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-selah-webhook-secret": secret,
      },
      body: JSON.stringify({
        id: data.responseId,
        response_id: data.responseId,
        survey_id: data.surveyId,
        survey_slug: data.surveySlug,
        survey_title: data.surveyTitle,
        name: data.name,
        email: data.email || null,
        answers: data.answers,
        result_type_id: data.resultTypeId,
        primary_money_type_id: data.primaryMoneyTypeId,
        secondary_money_type_id: data.secondaryMoneyTypeId,
        primary_faith_lens_id: data.primaryFaithLensId,
        privacy_consent: data.privacyConsent ?? true,
        result_email_consent: Boolean(data.email),
        marketing_consent: data.marketingConsent ?? false,
        email_content: data.emailContent || null,
      }),
    });

    const text = await response.text();
    let payload: unknown = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!response.ok) {
      return {
        status: "failed" as const,
        httpStatus: response.status,
        error: typeof payload === "string" ? payload : JSON.stringify(payload),
      };
    }

    const intake = payload && typeof payload === "object" && "intake" in payload
      ? (payload as { intake?: { email_status?: string; saved?: boolean } }).intake
      : undefined;
    if (!data.email && intake?.saved) {
      return { status: "saved" as const };
    }
    if (intake?.email_status !== "sent") {
      return { status: "email_failed" as const, emailStatus: intake?.email_status ?? "unknown" };
    }
    return { status: "sent" as const };
  });
