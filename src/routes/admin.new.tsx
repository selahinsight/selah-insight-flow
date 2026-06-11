import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  validateSurveyJson,
  surveyFromParsed,
  upsertSurvey,
  type ParsedSurvey,
} from "@/lib/survey-store";
import { CheckCircle2, AlertTriangle, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/new")({
  component: NewSurvey,
});

const EXAMPLE = `{
  "title": "감정 회복 자기진단",
  "slug": "emotion-recovery",
  "description": "지금 내 감정 상태를 살펴보는 짧은 진단입니다.",
  "completion_message": "응답이 저장되었습니다. 곧 결과를 정리해서 알려드릴게요.",
  "audience_type": "general",
  "estimated_time": "약 3분",
  "questions": [
    {
      "type": "single_choice",
      "text": "요즘 가장 자주 느끼는 감정은?",
      "options": ["지친다", "복잡하다", "무감각하다", "회복 중"]
    },
    { "type": "scale_1_5", "text": "지금 내 회복 에너지 점수는?" },
    { "type": "long_text", "text": "지금 가장 회복되고 싶은 영역을 적어주세요." }
  ]
}`;

function NewSurvey() {
  const navigate = useNavigate();
  const [json, setJson] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedSurvey | null>(null);

  function validate() {
    setParsed(null);
    if (!json.trim()) {
      setErrors(["JSON을 붙여넣어 주세요."]);
      return;
    }
    const r = validateSurveyJson(json);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors([]);
    setParsed(r.data ?? null);
  }

  function createAndGo() {
    if (!parsed) return;
    const s = surveyFromParsed(parsed, json);
    upsertSurvey(s);
    toast.success("설문이 만들어졌습니다");
    navigate({ to: "/admin/surveys/$id/edit", params: { id: s.id } });
  }

  return (
    <AdminShell
      title="새 설문 만들기"
      subtitle="ChatGPT에서 만든 설문 JSON을 붙여넣으면, 설문 URL을 발행하고 응답을 관리할 수 있습니다."
      showBack
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-white/80 p-6 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">설문 JSON</label>
              <button
                type="button"
                onClick={() => setJson(EXAMPLE)}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-white px-3 py-1 text-xs text-foreground/70 hover:bg-[var(--sand)]/40"
              >
                <ClipboardPaste className="h-3 w-3" /> 예시 채우기
              </button>
            </div>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={20}
              spellCheck={false}
              placeholder="ChatGPT에서 만든 설문 JSON을 여기에 붙여넣으세요"
              className="w-full rounded-xl border border-border/70 bg-[var(--ivory)] px-4 py-3 font-mono text-xs leading-relaxed text-foreground/90 focus:outline-none focus:ring-2 focus:ring-[var(--clay)]/30"
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={validate}
                className="rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white shadow-soft"
              >
                JSON 검증하기
              </button>
              {parsed && (
                <button
                  onClick={createAndGo}
                  className="rounded-full border border-[var(--clay)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--clay)]"
                >
                  설문 미리보기로 이동 →
                </button>
              )}
            </div>

            {errors.length > 0 && (
              <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" /> 검증 오류
                </div>
                <ul className="ml-5 list-disc space-y-1 text-sm text-destructive/90">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {parsed && (
              <div className="mt-5 rounded-xl border border-[var(--sage)] bg-[var(--sage)]/15 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--clay)]">
                  <CheckCircle2 className="h-4 w-4" /> 검증 완료
                </div>
                <p className="text-sm text-foreground/80">
                  <strong>{parsed.title}</strong> · 질문 {parsed.questions.length}개 ·{" "}
                  {parsed.audience_type === "christian" ? "기독교인용" : "일반"} ·{" "}
                  {parsed.estimated_time}
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-white/70 p-6 shadow-card">
            <p className="font-serif text-lg text-foreground">JSON 스키마</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ChatGPT에 아래 스키마로 설문 JSON을 만들어 달라고 요청하세요.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-foreground/80">
              <li>· title (string, 필수)</li>
              <li>· slug (string, 선택)</li>
              <li>· description (string)</li>
              <li>· completion_message (string)</li>
              <li>· audience_type: general / christian</li>
              <li>· estimated_time (string)</li>
              <li>· bible_verse (string, 선택)</li>
              <li>· questions[] (필수)</li>
            </ul>
            <p className="mt-4 text-xs font-medium text-foreground">질문 유형</p>
            <ul className="mt-1 space-y-1 text-xs text-foreground/80">
              <li>· short_text</li>
              <li>· long_text</li>
              <li>· single_choice (options[])</li>
              <li>· multiple_choice (options[])</li>
              <li>· scale_1_5</li>
            </ul>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
