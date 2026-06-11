import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminShell, SurveyTabs } from "@/components/admin/admin-shell";
import { useSurvey } from "@/lib/use-surveys";
import { upsertSurvey, uid, type Question, type QuestionType } from "@/lib/survey-store";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/surveys/$id/edit")({
  component: EditQuestions,
});

function EditQuestions() {
  const { id } = Route.useParams();
  const survey = useSurvey(id);
  const navigate = useNavigate();
  if (!survey) {
    return (
      <AdminShell title="설문 없음">
        <p className="text-sm text-muted-foreground">설문을 찾을 수 없습니다.</p>
      </AdminShell>
    );
  }

  function update(qs: Question[]) {
    upsertSurvey({ ...survey!, questions: qs });
  }
  function patch(p: Partial<typeof survey>) {
    upsertSurvey({ ...survey!, ...p });
  }

  function move(i: number, dir: -1 | 1) {
    const qs = [...survey!.questions];
    const j = i + dir;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
    update(qs);
  }

  function add() {
    update([
      ...survey!.questions,
      { id: uid("q"), type: "short_text", text: "새 질문", required: true },
    ]);
  }

  return (
    <AdminShell
      title={survey.title}
      subtitle="설문 본문과 질문을 편집합니다."
      showBack
      actions={
        <button
          onClick={() => navigate({ to: "/admin/surveys/$id/publish", params: { id } })}
          className="rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white shadow-soft"
        >
          공개 설정으로
        </button>
      }
    >
      <SurveyTabs id={id} />

      <div className="mb-8 grid gap-4 rounded-2xl border border-border/60 bg-white/70 p-6 shadow-card md:grid-cols-2">
        <Field label="제목">
          <input
            value={survey.title}
            onChange={(e) => patch({ title: e.target.value })}
            className="w-full rounded-xl border border-border/70 bg-white px-4 py-2.5 text-sm"
          />
        </Field>
        <Field label="예상 소요 시간">
          <input
            value={survey.estimated_time}
            onChange={(e) => patch({ estimated_time: e.target.value })}
            className="w-full rounded-xl border border-border/70 bg-white px-4 py-2.5 text-sm"
          />
        </Field>
        <Field label="대상" full>
          <div className="flex gap-2">
            {(["general", "christian"] as const).map((a) => (
              <button
                key={a}
                onClick={() => patch({ audience_type: a })}
                className={`rounded-full border px-4 py-2 text-sm ${
                  survey.audience_type === a
                    ? "border-[var(--clay)] bg-[var(--clay)] text-white"
                    : "border-border/60 bg-white"
                }`}
              >
                {a === "general" ? "일반" : "기독교인"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="설명" full>
          <textarea
            value={survey.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={2}
            className="w-full rounded-xl border border-border/70 bg-white px-4 py-2.5 text-sm"
          />
        </Field>
        {survey.audience_type === "christian" && (
          <Field label="말씀 (시작/완료 화면에 표시)" full>
            <textarea
              value={survey.bible_verse ?? ""}
              onChange={(e) => patch({ bible_verse: e.target.value })}
              rows={2}
              placeholder="예: 너의 짐을 여호와께 맡겨 버리라 — 시편 55:22"
              className="w-full rounded-xl border border-border/70 bg-white px-4 py-2.5 text-sm"
            />
          </Field>
        )}
        <Field label="완료 메시지" full>
          <textarea
            value={survey.completion_message}
            onChange={(e) => patch({ completion_message: e.target.value })}
            rows={2}
            className="w-full rounded-xl border border-border/70 bg-white px-4 py-2.5 text-sm"
          />
        </Field>
      </div>

      <div className="space-y-4">
        {survey.questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="rounded-full bg-[var(--rose-soft)]/40 px-3 py-1 text-xs text-[var(--clay)]">
                Q{i + 1}
              </span>
              <div className="flex items-center gap-1">
                <select
                  value={q.type}
                  onChange={(e) => {
                    const t = e.target.value as QuestionType;
                    const qs = [...survey.questions];
                    const needsOptions = t === "single_choice" || t === "multiple_choice";
                    qs[i] = {
                      ...q,
                      type: t,
                      options: needsOptions ? q.options ?? ["선택지 1", "선택지 2"] : undefined,
                    };
                    update(qs);
                  }}
                  className="rounded-full border border-border/60 bg-white px-3 py-1 text-xs"
                >
                  <option value="short_text">단답 (short_text)</option>
                  <option value="long_text">서술 (long_text)</option>
                  <option value="single_choice">단일 선택 (single_choice)</option>
                  <option value="multiple_choice">복수 선택 (multiple_choice)</option>
                  <option value="scale_1_5">척도 1-5 (scale_1_5)</option>
                </select>
                <IconBtn onClick={() => move(i, -1)} title="위로">
                  <ArrowUp className="h-4 w-4" />
                </IconBtn>
                <IconBtn onClick={() => move(i, 1)} title="아래로">
                  <ArrowDown className="h-4 w-4" />
                </IconBtn>
                <IconBtn
                  onClick={() => update(survey.questions.filter((_, j) => j !== i))}
                  title="삭제"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </IconBtn>
              </div>
            </div>

            <textarea
              value={q.text}
              onChange={(e) => {
                const qs = [...survey.questions];
                qs[i] = { ...q, text: e.target.value };
                update(qs);
              }}
              rows={2}
              className="w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-sm font-serif"
            />

            {(q.type === "single_choice" || q.type === "multiple_choice") && (
              <div className="mt-3 space-y-2">
                {(q.options ?? []).map((opt, oi) => {
                  const label = typeof opt === "string" ? opt : opt.text;
                  return (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        value={label}
                        onChange={(e) => {
                          const qs = [...survey.questions];
                          const opts = [...(q.options ?? [])];
                          const cur = opts[oi];
                          opts[oi] =
                            typeof cur === "string"
                              ? e.target.value
                              : { ...cur, text: e.target.value };
                          qs[i] = { ...q, options: opts };
                          update(qs);
                        }}
                        className="flex-1 rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                      />
                      <IconBtn
                        onClick={() => {
                          const qs = [...survey.questions];
                          qs[i] = { ...q, options: (q.options ?? []).filter((_, j) => j !== oi) };
                          update(qs);
                        }}
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </IconBtn>
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    const qs = [...survey.questions];
                    qs[i] = { ...q, options: [...(q.options ?? []), "새 선택지"] };
                    update(qs);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-foreground/70 hover:bg-white"
                >
                  <Plus className="h-3 w-3" /> 선택지 추가
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => {
            add();
            toast.success("질문이 추가되었습니다");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-white/40 py-5 text-sm text-foreground/70 hover:bg-white"
        >
          <Plus className="h-4 w-4" /> 질문 추가
        </button>
      </div>
    </AdminShell>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-1.5 block text-xs font-medium text-foreground/70">{label}</label>
      {children}
    </div>
  );
}

function IconBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="grid h-8 w-8 place-items-center rounded-full text-foreground/60 transition hover:bg-[var(--rose-soft)]/30"
    >
      {children}
    </button>
  );
}
