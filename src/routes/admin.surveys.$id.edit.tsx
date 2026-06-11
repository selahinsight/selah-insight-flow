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
      { id: uid("q"), type: "single", text: "새 질문", required: true, options: [] },
    ]);
  }

  return (
    <AdminShell
      title={survey.title}
      subtitle="AI가 만든 질문을 자유롭게 다듬어 보세요."
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
                    qs[i] = { ...q, type: t, options: t === "text" ? undefined : q.options ?? [] };
                    update(qs);
                  }}
                  className="rounded-full border border-border/60 bg-white px-3 py-1 text-xs"
                >
                  <option value="single">단일 선택</option>
                  <option value="multi">복수 선택</option>
                  <option value="scale">척도(1-10)</option>
                  <option value="text">주관식</option>
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

            {(q.type === "single" || q.type === "multi") && (
              <div className="mt-3 space-y-2">
                {(q.options ?? []).map((o, oi) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input
                      value={o.label}
                      onChange={(e) => {
                        const qs = [...survey.questions];
                        const opts = [...(q.options ?? [])];
                        opts[oi] = { ...o, label: e.target.value };
                        qs[i] = { ...q, options: opts };
                        update(qs);
                      }}
                      className="flex-1 rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                    />
                    <select
                      value={o.typeKey ?? ""}
                      onChange={(e) => {
                        const qs = [...survey.questions];
                        const opts = [...(q.options ?? [])];
                        opts[oi] = { ...o, typeKey: e.target.value };
                        qs[i] = { ...q, options: opts };
                        update(qs);
                      }}
                      className="rounded-lg border border-border/60 bg-white px-2 py-2 text-xs"
                    >
                      <option value="">유형 미지정</option>
                      {survey.resultTypes.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.key} — {t.name}
                        </option>
                      ))}
                    </select>
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
                ))}
                <button
                  onClick={() => {
                    const qs = [...survey.questions];
                    qs[i] = {
                      ...q,
                      options: [...(q.options ?? []), { id: uid("o"), label: "새 선택지", typeKey: "" }],
                    };
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
