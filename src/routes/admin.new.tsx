import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  validateSurveyJson,
  surveyFromParsed,
  upsertSurvey,
  SURVEY_CATEGORIES,
  type ParsedSurvey,
  type SurveyCategory,
  type Survey,
} from "@/lib/survey-store";
import {
  DEFAULT_DESIGN,
  THEMES,
  BUTTON_STYLES,
  CARD_STYLES,
  FONT_MOODS,
  type DesignSettings,
  type ThemeKey,
  type ButtonStyleKey,
  type CardStyleKey,
  type FontMoodKey,
} from "@/lib/survey-themes";
import {
  CheckCircle2,
  AlertTriangle,
  ClipboardPaste,
  ExternalLink,
  Link2,
  BarChart3,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export const Route = createFileRoute("/admin/new")({
  component: NewSurvey,
});

const EXAMPLE = `{
  "title": "감정 회복 자기진단",
  "slug": "emotion-recovery",
  "description": "지금 내 감정 상태를 살펴보는 짧은 진단입니다.",
  "completion_message": "응답이 저장되었습니다. 곧 결과를 정리해서 알려드릴게요.",
  "audience_type": "general",
  "category": "pre_diagnosis",
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
  const [category, setCategory] = useState<SurveyCategory>("other");
  const [design, setDesign] = useState<DesignSettings>({ ...DEFAULT_DESIGN });
  const [created, setCreated] = useState<Survey | null>(null);

  function validate() {
    setParsed(null);
    setCreated(null);
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
    if (r.data?.category) setCategory(r.data.category);
  }

  function clearAll() {
    setJson("");
    setErrors([]);
    setParsed(null);
    setCreated(null);
    toast.success("입력 내용이 삭제되었습니다.");
  }

  function createAndPublish() {
    if (!parsed) return;
    const s = surveyFromParsed({ ...parsed, category }, json);
    s.status = "published"; // 발행하여 테스트 응답 가능
    s.design_settings = { ...design };
    upsertSurvey(s);
    setCreated(s);
    toast.success("설문이 만들어졌습니다 (설문중)");
  }


  const shareUrl =
    created && typeof window !== "undefined"
      ? `${window.location.origin}/s/${created.slug}`
      : "";

  return (
    <AdminShell
      title="새 설문 만들기"
      subtitle="ChatGPT에서 만든 설문 JSON을 붙여넣어 설문을 발행합니다."
      showBack
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-white/80 p-6 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-foreground">설문 JSON</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setJson(EXAMPLE)}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-white px-3 py-1 text-xs text-foreground/70 hover:bg-[var(--sand)]/40"
                >
                  <ClipboardPaste className="h-3 w-3" /> 예시 채우기
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      disabled={!json.trim() && !parsed && errors.length === 0}
                      className="inline-flex items-center gap-1 rounded-full border border-[#C99A8E]/60 bg-white px-3 py-1 text-xs text-[#A8675C] hover:bg-[#F4E6E2]/40 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3 w-3" /> 전체 삭제
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>입력 내용을 모두 지울까요?</AlertDialogTitle>
                      <AlertDialogDescription>
                        새 설문 만들기 화면의 JSON 입력 내용만 지워집니다.
                        기존에 발행된 설문이나 응답 데이터는 삭제되지 않습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={clearAll}
                        className="bg-[#B7766F] hover:bg-[#A8675C]"
                      >
                        지우기
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={20}
              spellCheck={false}
              placeholder="ChatGPT에서 만든 설문 JSON을 여기에 붙여넣으세요"
              className="w-full rounded-xl border border-border/70 bg-[var(--ivory)] px-4 py-3 font-mono text-xs leading-relaxed text-foreground/90 focus:outline-none focus:ring-2 focus:ring-[var(--clay)]/30"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <label className="flex items-center gap-2 text-xs text-foreground/70">
                <span className="shrink-0">설문 유형</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SurveyCategory)}
                  className="flex-1 rounded-full border border-border bg-white px-3 py-2 text-xs"
                >
                  {SURVEY_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={validate}
                className="rounded-full border border-[var(--clay)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--clay)]"
              >
                JSON 검증
              </button>
              {parsed && !created && (
                <button
                  onClick={createAndPublish}
                  className="rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white shadow-soft"
                >
                  설문 만들기 →
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

            {parsed && !created && (
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

            {parsed && !created && (
              <DesignSettingsPanel value={design} onChange={setDesign} />
            )}



            {created && (
              <div className="mt-5 rounded-2xl border border-[var(--sage)] bg-[var(--sage)]/20 p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--clay)]">
                  <CheckCircle2 className="h-4 w-4" /> 설문이 발행되었습니다 (설문중)
                </div>
                <p className="text-sm text-foreground/80">
                  공개 URL을 새 탭에서 열어 테스트 응답을 제출해 보세요. 제출한 응답은 결과 보기
                  화면에서 바로 확인할 수 있습니다.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`/s/${created.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--clay)] px-4 py-2 text-xs font-medium text-white shadow-soft"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> 공개 URL 열기
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success("공유 URL이 복사되었습니다");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-4 py-2 text-xs text-foreground/80 hover:bg-[var(--sand)]/40"
                  >
                    <Link2 className="h-3.5 w-3.5" /> URL 복사
                  </button>
                  <Link
                    to="/admin/surveys/$id/analytics"
                    params={{ id: created.id }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-4 py-2 text-xs text-foreground/80 hover:bg-[var(--sand)]/40"
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> 결과 보기
                  </Link>
                  <Link
                    to="/admin/surveys/$id/edit"
                    params={{ id: created.id }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-4 py-2 text-xs text-foreground/80 hover:bg-[var(--sand)]/40"
                  >
                    <Pencil className="h-3.5 w-3.5" /> 편집
                  </Link>
                  <button
                    onClick={() => navigate({ to: "/admin" })}
                    className="ml-auto text-xs text-foreground/60 underline hover:text-[var(--clay)]"
                  >
                    내 설문으로
                  </button>
                </div>
                <p className="mt-3 break-all rounded-lg bg-white/70 p-2 font-mono text-[11px] text-foreground/70">
                  {shareUrl}
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
              <li>· category: customer_understanding / program_application / content_reaction / pre_diagnosis / feedback / other</li>
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

function DesignSettingsPanel({
  value,
  onChange,
}: {
  value: DesignSettings;
  onChange: (d: DesignSettings) => void;
}) {
  const t = THEMES[value.theme];
  return (
    <div className="mt-5 rounded-2xl border border-border/60 bg-[var(--ivory)]/60 p-5">
      <p className="text-sm font-medium text-foreground">디자인 설정</p>
      <p className="mt-1 text-xs text-muted-foreground">
        설문 레이아웃은 고정되어 있고, 컬러와 무드만 선택할 수 있어요.
      </p>

      {/* Color theme */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-foreground/80">컬러 테마</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const th = THEMES[key];
            const active = key === value.theme;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ ...value, theme: key })}
                className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-left transition ${
                  active ? "border-[var(--clay)] ring-1 ring-[var(--clay)]" : "border-border/60"
                }`}
              >
                <span className="flex shrink-0 gap-0.5">
                  {th.swatch.map((c, i) => (
                    <span
                      key={i}
                      className="h-5 w-2.5 rounded-sm"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                <span className="text-xs text-foreground/80">{th.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Button style */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <SelectChips
          label="버튼 스타일"
          options={BUTTON_STYLES}
          value={value.button_style}
          onChange={(v) => onChange({ ...value, button_style: v as ButtonStyleKey })}
        />
        <SelectChips
          label="카드 스타일"
          options={CARD_STYLES}
          value={value.card_style}
          onChange={(v) => onChange({ ...value, card_style: v as CardStyleKey })}
        />
        <SelectChips
          label="폰트 무드"
          options={FONT_MOODS.map((f) => ({ value: f.value, label: f.label }))}
          value={value.font_mood}
          onChange={(v) => onChange({ ...value, font_mood: v as FontMoodKey })}
        />
      </div>

      {/* Mini preview */}
      <div
        className="mt-4 rounded-xl p-4"
        style={{ backgroundColor: t.bg, color: t.text }}
      >
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
          }}
        >
          <p className="text-[10px] tracking-[0.25em]" style={{ color: t.accent }}>
            PREVIEW
          </p>
          <p className="mt-1 text-sm" style={{ color: t.text }}>
            설문 미리보기 예시
          </p>
          <button
            type="button"
            className="mt-2 rounded-full px-3 py-1 text-xs"
            style={{
              backgroundColor: t.accent,
              color: t.accentText,
            }}
          >
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-foreground/80">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                active
                  ? "border-[var(--clay)] bg-[var(--clay)] text-white"
                  : "border-border/60 bg-white text-foreground/70"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

