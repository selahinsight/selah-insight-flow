import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  AUDIENCE_OPTIONS,
  PURPOSE_OPTIONS,
  THEME_OPTIONS,
  TONE_OPTIONS,
  generateSurveyFromInputs,
  upsertSurvey,
  type Survey,
} from "@/lib/survey-store";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/new")({
  component: NewSurvey,
});

function NewSurvey() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    purposes: [PURPOSE_OPTIONS[0]] as string[],
    customPurpose: "",
    audience: AUDIENCE_OPTIONS[0],
    coreInfo: "",
    questionCount: 8,
    tone: TONE_OPTIONS[0],
    resultCount: 4,
    theme: "ivory" as Survey["theme"],
  });
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function togglePurpose(p: string) {
    setForm((f) => ({
      ...f,
      purposes: f.purposes.includes(p) ? f.purposes.filter((x) => x !== p) : [...f.purposes, p],
    }));
  }

  function onGenerate() {
    if (!form.title.trim()) {
      toast.error("설문 주제를 입력해 주세요");
      return;
    }
    if (form.purposes.length === 0 && !form.customPurpose.trim()) {
      toast.error("설문 목적을 하나 이상 선택해 주세요");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const s = generateSurveyFromInputs(form);
      upsertSurvey(s);
      toast.success("AI 시뮬레이션으로 초안을 생성했습니다");
      navigate({ to: "/admin/surveys/$id/edit", params: { id: s.id } });
    }, 500);
  }

  return (
    <AdminShell
      title="새 설문 만들기"
      subtitle="기본 정보를 입력하면 AI가 설문 초안을 만들어 드립니다."
      showBack
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Field label="설문 주제" hint="예: 관계 패턴 진단, 번아웃 자기진단, 감정 회복 진단">
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="설문 제목을 입력하세요"
                className="w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clay)]/30"
              />
            </Field>

            <Field label="설문 목적 (다중 선택)" hint="여러 목적을 동시에 가질 수 있습니다">
              <div className="flex flex-wrap gap-2">
                {PURPOSE_OPTIONS.map((o) => {
                  const active = form.purposes.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => togglePurpose(o)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        active
                          ? "border-[var(--clay)] bg-[var(--clay)] text-white"
                          : "border-border/60 bg-white text-foreground/80 hover:bg-[var(--sand)]/40"
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              <input
                value={form.customPurpose}
                onChange={(e) => update("customPurpose", e.target.value)}
                placeholder="직접 입력 — 예: 신규 프로그램 사전 진단"
                className="mt-3 w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clay)]/30"
              />
            </Field>

            <Field label="응답자 관계">
              <Pills value={form.audience} onChange={(v) => update("audience", v)} options={AUDIENCE_OPTIONS} />
            </Field>

            <Field label="알고 싶은 핵심 정보" hint="예: 현재 감정 상태, 회복 루틴, 구매 장벽">
              <textarea
                value={form.coreInfo}
                onChange={(e) => update("coreInfo", e.target.value)}
                rows={3}
                placeholder="응답자에게서 알고 싶은 정보를 자유롭게 적어주세요"
                className="w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clay)]/30"
              />
            </Field>
          </Card>

          <Card>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label="질문 개수">
                <Stepper value={form.questionCount} min={3} max={20} onChange={(v) => update("questionCount", v)} />
              </Field>
              <Field label="결과 유형 개수">
                <Stepper value={form.resultCount} min={2} max={8} onChange={(v) => update("resultCount", v)} />
              </Field>
            </div>
            <Field label="질문 톤">
              <Pills value={form.tone} onChange={(v) => update("tone", v)} options={TONE_OPTIONS} />
            </Field>

            <Field label="컬러 테마">
              <div className="flex flex-wrap gap-2">
                {THEME_OPTIONS.map((t) => {
                  const active = form.theme === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update("theme", t.value)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                        active ? "border-[var(--clay)] bg-white shadow-card" : "border-border/60 bg-white/60 hover:bg-white"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: t.swatch }} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Card>
        </div>

        <aside className="space-y-4">
          <div className="sticky top-6 rounded-3xl bg-gradient-clay p-6 text-white shadow-soft">
            <div className="flex items-center justify-between">
              <Sparkles className="h-6 w-6" />
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] tracking-wider">
                AI 생성 시뮬레이션
              </span>
            </div>
            <p className="mt-3 font-serif text-xl leading-snug">
              입력한 주제·목적·핵심 정보를<br />반영해 질문을 만듭니다
            </p>
            <p className="mt-2 text-sm text-white/80">
              아직 Lovable AI Gateway가 연결되기 전 단계입니다. 생성된 초안은 자유롭게 편집할 수 있어요.
            </p>
            <button
              disabled={busy}
              onClick={onGenerate}
              className="mt-6 w-full rounded-full bg-white px-5 py-3 text-sm font-medium text-[var(--clay)] shadow disabled:opacity-60"
            >
              {busy ? "생성 중..." : "AI로 설문 생성"}
            </button>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 rounded-2xl border border-border/60 bg-white/80 p-6 shadow-card">{children}</div>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
function Pills({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              active
                ? "border-[var(--clay)] bg-[var(--clay)] text-white"
                : "border-border/60 bg-white text-foreground/80 hover:bg-[var(--sand)]/40"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-2 py-1">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--sand)]/50">−</button>
      <span className="w-10 text-center font-serif text-lg text-[var(--clay)]">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--sand)]/50">+</button>
    </div>
  );
}
