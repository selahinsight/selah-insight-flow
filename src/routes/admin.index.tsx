import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { useSurveys } from "@/lib/use-surveys";
import { deleteSurvey, upsertSurvey } from "@/lib/survey-store";
import { Eye, BarChart3, Pencil, Plus, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const surveys = useSurveys();
  const navigate = useNavigate();

  const totalResponses = surveys.reduce((a, s) => a + s.responses.length, 0);
  const published = surveys.filter((s) => s.status === "published").length;

  function copyLink(slug: string) {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("공개 링크가 복사되었습니다");
  }

  return (
    <AdminShell
      title="내가 만든 설문"
      subtitle="설문을 만들고, 응답을 받고, 분석합니다."
      actions={
        <button
          onClick={() => navigate({ to: "/admin/new" })}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-rose px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:translate-y-[-1px]"
        >
          <Plus className="h-4 w-4" /> 새 설문 만들기
        </button>
      }
    >
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="전체 설문" value={surveys.length} />
        <Stat label="공개 중" value={published} />
        <Stat label="누적 응답" value={totalResponses} />
      </div>

      {surveys.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/70 shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-[var(--rose-soft)]/20 text-left text-xs uppercase tracking-wider text-foreground/60">
              <tr>
                <th className="px-5 py-4">설문</th>
                <th className="px-5 py-4">공개 상태</th>
                <th className="px-5 py-4">응답 수</th>
                <th className="px-5 py-4">최근 응답</th>
                <th className="px-5 py-4 text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((s) => {
                const last = s.responses[s.responses.length - 1];
                return (
                  <tr key={s.id} className="border-t border-border/60 align-middle">
                    <td className="px-5 py-4">
                      <Link
                        to="/admin/surveys/$id/edit"
                        params={{ id: s.id }}
                        className="font-serif text-base text-foreground hover:text-[var(--clay)]"
                      >
                        {s.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.audience} · 질문 {s.questions.length}개 · 유형 {s.resultTypes.length}개
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => {
                          upsertSurvey({
                            ...s,
                            status: s.status === "published" ? "draft" : "published",
                          });
                        }}
                        className={`rounded-full px-3 py-1 text-xs ${
                          s.status === "published"
                            ? "bg-[var(--sage)]/40 text-[var(--clay)]"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.status === "published" ? "공개" : "비공개"}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-foreground/80">{s.responses.length}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {last ? new Date(last.submittedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="편집" onClick={() => navigate({ to: "/admin/surveys/$id/edit", params: { id: s.id } })}>
                          <Pencil className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn title="결과 보기" onClick={() => navigate({ to: "/admin/surveys/$id/analytics", params: { id: s.id } })}>
                          <BarChart3 className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn title="미리보기" onClick={() => window.open(`/s/${s.slug}`, "_blank")}>
                          <Eye className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn title="링크 복사" onClick={() => copyLink(s.slug)}>
                          <Link2 className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn
                          title="삭제"
                          onClick={() => {
                            if (confirm("이 설문을 삭제할까요?")) {
                              deleteSurvey(s.id);
                              toast.success("삭제되었습니다");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl text-[var(--clay)]">{value}</p>
    </div>
  );
}

function IconBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="grid h-8 w-8 place-items-center rounded-full text-foreground/60 transition hover:bg-[var(--rose-soft)]/30 hover:text-[var(--clay)]"
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border/80 bg-white/50 p-12 text-center shadow-card">
      <p className="font-serif text-2xl text-foreground">아직 만든 설문이 없습니다</p>
      <p className="mt-2 text-sm text-muted-foreground">
        AI로 첫 번째 자기진단 설문을 만들어 보세요.
      </p>
      <Link
        to="/admin/new"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-rose px-6 py-2.5 text-sm font-medium text-white shadow-soft"
      >
        <Plus className="h-4 w-4" /> 새 설문 만들기
      </Link>
    </div>
  );
}
