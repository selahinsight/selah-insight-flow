import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const resultAccessInput = z.object({
  resultNumber: z.string().trim().regex(/^r_[A-Za-z0-9_-]{7,80}$/),
  token: z.string().trim().min(32).max(256).regex(/^[A-Za-z0-9_-]+$/),
});

const studioResultPayload = z.object({
  ok: z.literal(true),
  result: z.object({
    result_number: z.string(),
    name: z.string().nullable().optional(),
    answers: z.record(z.any()).default({}),
    result_type_id: z.string().nullable().optional(),
    primary_money_type_id: z.string().nullable().optional(),
    secondary_money_type_id: z.string().nullable().optional(),
    primary_faith_lens_id: z.string().nullable().optional(),
    status: z.string().optional(),
    submitted_at: z.string().nullable().optional(),
    expires_at: z.string().nullable().optional(),
  }),
});

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const loadStudioSurveyResult = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => resultAccessInput.parse(data))
  .handler(async ({ data }) => {
    const secret =
      process.env.SELAH_STUDIO_WEBHOOK_SECRET ||
      process.env.INBOUND_WEBHOOK_SECRET;
    if (!secret) throw new Error("결과 연결 설정을 확인해주세요.");

    const intakeUrl =
      process.env.SELAH_STUDIO_INTAKE_URL ||
      "https://selah-studio-ivy.ivy-girl.chatgpt.site/api/intake/survey-response";
    const endpoint =
      process.env.SELAH_STUDIO_RESULT_URL ||
      new URL("/api/intake/survey-result", intakeUrl).toString();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-selah-webhook-secret": secret,
      },
      body: JSON.stringify({
        result_number: data.resultNumber,
        access_token_hash: await sha256Hex(data.token),
      }),
    });

    if (!response.ok) {
      if (response.status === 410) throw new Error("결과 연결 링크가 만료되었습니다. 결과 메일을 다시 받아주세요.");
      if (response.status === 404) throw new Error("연결할 진단 결과를 찾지 못했습니다. 결과 메일을 다시 받아주세요.");
      throw new Error("진단 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    }

    const parsed = studioResultPayload.safeParse(await response.json());
    if (!parsed.success) throw new Error("진단 결과 형식을 확인하지 못했습니다.");

    const result = parsed.data.result;
    return {
      responseId: result.result_number,
      name: result.name ?? "",
      answers: result.answers,
      resultTypeId: result.result_type_id ?? null,
      primaryMoneyTypeId: result.primary_money_type_id ?? null,
      secondaryMoneyTypeId: result.secondary_money_type_id ?? null,
      primaryFaithLensId: result.primary_faith_lens_id ?? null,
      expiresAt: result.expires_at ?? null,
    };
  });
