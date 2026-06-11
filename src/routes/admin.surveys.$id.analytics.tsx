import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, SurveyTabs } from "@/components/admin/admin-shell";
import { useSurvey } from "@/lib/use-surveys";
import {
  buildAnalysisPrompt,
  buildContentIdeaPrompt,
  buildCustomerLanguageDump,
} from "@/lib/survey-store";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/surveys/$id/analytics")({
  component: Analytics,
});

function Analytics() {
  const { id } = Route.useParams();
  const survey = useSurvey(id);
  if (!survey) return <AdminShell title="설문 없음">{null}</AdminShell>;

  const total = survey.responses.length;

  function downloadCsv() {
    const headers = ["id", "submittedAt", ...survey!.questions.map((q, i) => `Q${i + 1}`)];
    const rows = survey!.responses.map((r) => {
      const cells = [
        r.id,
        new Date(r.submittedAt).toISOString(),
        ...survey!.questions.map((q) => {
          const v = r.answers[q.id];
          if (v === undefined) return "";
          const s = Array.isArray(v) ? v.join(" | ") : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        }),
      ];
      return cells.join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${survey!.slug}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    toast.success(`${label}을(를) 복사했습니다`);
  }

  return (
    <AdminShell title={survey.title} subtitle="응답 데이터와 ChatGPT 분석 프롬프트" showBack>
      <SurveyTabs id={id} />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white shadow-soft"
        >
          <Download className="h-4 w-4" /> CSV 다운로드
        </button>
        <button
          onClick={() => copy(buildAnalysisPrompt(survey!), "ChatGPT 분석 프롬프트")}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-5 py-2.5 text-sm text-foreground/80 hover:bg-[var(--sand)]/40"
        >
          <Copy className="h-4 w-4" /> ChatGPT 분석 프롬프트 복사
        </button>
        <button
          onClick={() => copy(buildContentIdeaPrompt(survey!), "콘텐츠 아이디어 프롬프트")}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-5 py-2.5 text-sm text-foreground/80 hover:bg-[var(--sand)]/40"
        >
          <Copy className="h-4 w-4" /> 콘텐츠 아이디어 프롬프트 복사
        </button>
        <button
          onClick={() => copy(buildCustomerLanguageDump(survey!), "고객 실제 표현")}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-5 py-2.5 text-sm text-foreground/80 hover:bg-[var(--sand)]/40"
        >
          <Copy className="h-4 w-4" /> 고객 실제 표현 복사
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="전체 응답" value={total} />
        <Stat label="질문 수" value={survey.questions.length} />
        <Stat
          label="주관식 응답"
          value={survey.responses.reduce((a, r) => {
            return (
              a +
              Object.entries(r.answers).filter(([qid, v]) => {
                const q = survey.questions.find((x) => x.id === qid);
                return (
                  (q?.type === "short_text" || q?.type === "long_text") &&
                  typeof v === "string" &&
                  v.trim().length > 0
                );
              }).length
            );
          }, 0)}
        />
      </div>

      <Section title="응답 목록">
        {total === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-white/70">
            <table className="w-full text-sm">
              <thead className="bg-[var(--rose-soft)]/20 text-left text-xs uppercase tracking-wider text-foreground/60">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">제출일</th>
                  {survey.questions.map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      Q{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {survey.responses
                  .slice()
                  .reverse()
                  .map((r) => (
                    <tr key={r.id} className="border-t border-border/60 align-top">
                      <td className="px-4 py-3 font-mono text-[11px]">{r.id}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.submittedAt).toLocaleString()}
                      </td>
                      {survey.questions.map((q) => {
                        const v = r.answers[q.id];
                        let display = "—";
                        if (Array.isArray(v)) display = v.join(", ");
                        else if (v !== undefined && v !== "") display = String(v);
                        return (
                          <td key={q.id} className="px-4 py-3 text-xs text-foreground/80">
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="질문별 분포">
        <div className="space-y-3">
          {survey.questions.map((q, i) => {
            if (q.type === "single_choice" || q.type === "multiple_choice") {
              const counts: Record<string, number> = {};
              const labels = (q.options ?? []).map((o) => (typeof o === "string" ? o : o.text));
              labels.forEach((l) => (counts[l] = 0));
              survey.responses.forEach((r) => {
                const v = r.answers[q.id];
                const vals = Array.isArray(v) ? v : v !== undefined ? [String(v)] : [];
                vals.forEach((x) => {
                  if (counts[x] !== undefined) counts[x] += 1;
                });
              });
              const max = Math.max(1, ...Object.values(counts));
              return (
                <div key={q.id} className="rounded-xl border border-border/60 bg-white/70 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Q{i + 1}. {q.text}
                  </p>
                  <div className="mt-3 space-y-2">
                    {labels.map((l) => (
                      <div key={l}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span>{l}</span>
                          <span className="text-muted-foreground">{counts[l]}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--rose-soft)]/30">
                          <div
                            className="h-full rounded-full bg-gradient-rose"
                            style={{ width: `${(counts[l] / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={q.id} className="rounded-xl border border-border/60 bg-white/70 p-4">
                <p className="text-sm font-medium text-foreground">
                  Q{i + 1}. {q.text}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {q.type === "scale_1_5" ? "1-5 척도" : "주관식"} — 표는 위 응답 목록에서 확인하세요.
                </p>
              </div>
            );
          })}
        </div>
      </Section>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-serif text-xl text-foreground">{title}</h2>
      <div className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-card">
        {children}
      </div>
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">아직 응답이 없습니다.</p>;
}
