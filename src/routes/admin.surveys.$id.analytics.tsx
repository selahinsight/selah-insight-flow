import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, SurveyTabs } from "@/components/admin/admin-shell";
import { useSurvey } from "@/lib/use-surveys";
import { Download } from "lucide-react";

export const Route = createFileRoute("/admin/surveys/$id/analytics")({
  component: Analytics,
});

function Analytics() {
  const { id } = Route.useParams();
  const survey = useSurvey(id);
  if (!survey) return <AdminShell title="설문 없음">{null}</AdminShell>;

  const total = survey.responses.length;
  const byType = survey.resultTypes.map((t) => ({
    key: t.key,
    name: t.name,
    count: survey.responses.filter((r) => r.resultTypeKey === t.key).length,
  }));

  function downloadCsv() {
    const headers = ["id", "submittedAt", "audience", "resultTypeKey"];
    const rows = survey!.responses.map((r) =>
      [r.id, new Date(r.submittedAt).toISOString(), r.audience ?? "", r.resultTypeKey].join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${survey!.slug}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell
      title={survey.title}
      subtitle="응답 분석 · 키워드 · 전환 가능성"
      actions={
        <button
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white shadow-soft"
        >
          <Download className="h-4 w-4" /> CSV 다운로드
        </button>
      }
    >
      <SurveyTabs id={id} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="전체 응답" value={total} />
        <Stat label="유형 수" value={survey.resultTypes.length} />
        <Stat label="질문 수" value={survey.questions.length} />
      </div>

      <Section title="유형별 분포">
        {byType.length === 0 || total === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-3">
            {byType.map((t) => {
              const pct = total ? Math.round((t.count / total) * 100) : 0;
              return (
                <div key={t.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-serif text-foreground">
                      {t.key} — {t.name}
                    </span>
                    <span className="text-muted-foreground">
                      {t.count}명 · {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--rose-soft)]/30">
                    <div
                      className="h-full rounded-full bg-gradient-rose"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Section title="고객이 실제로 쓴 표현">
          <KeywordCloud
            words={["회복", "지친다", "관계", "방향", "에너지", "혼자", "휴식", "균형"]}
          />
        </Section>
        <Section title="반복적으로 등장한 문제">
          <ul className="space-y-2 text-sm text-foreground/80">
            <li>· 충분히 쉬어도 회복이 잘 안 된다</li>
            <li>· 관계에서 같은 패턴이 반복된다</li>
            <li>· 무엇부터 시작해야 할지 모르겠다</li>
          </ul>
        </Section>
        <Section title="구매 장벽">
          <ul className="space-y-2 text-sm text-foreground/80">
            <li>· 효과가 있을지 확신이 없다</li>
            <li>· 가격 부담</li>
            <li>· 시간 확보가 어렵다</li>
          </ul>
        </Section>
        <Section title="프로그램 니즈 · 콘텐츠 아이디어">
          <ul className="space-y-2 text-sm text-foreground/80">
            <li>· 회복 루틴 30일 챌린지</li>
            <li>· 관계 패턴 1:1 진단</li>
            <li>· 짧은 명상 & 셀프케어 가이드</li>
          </ul>
        </Section>
      </div>

      <Section title="질문별 응답 통계">
        <div className="space-y-3">
          {survey.questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border/60 bg-white/70 p-4">
              <p className="text-sm font-medium text-foreground">
                Q{i + 1}. {q.text}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {q.type === "text" ? "주관식 응답" : "선택지별 분포는 응답이 쌓이면 표시됩니다."}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="전환 가능성이 높은 응답자">
        {total === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-white/70">
            <table className="w-full text-sm">
              <thead className="bg-[var(--rose-soft)]/20 text-left text-xs uppercase tracking-wider text-foreground/60">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">유형</th>
                  <th className="px-4 py-3">관계</th>
                  <th className="px-4 py-3">제출일</th>
                </tr>
              </thead>
              <tbody>
                {survey.responses.slice(0, 8).map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-3">{r.resultTypeKey}</td>
                    <td className="px-4 py-3">{r.audience ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

function KeywordCloud({ words }: { words: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {words.map((w, i) => (
        <span
          key={w}
          className="rounded-full bg-[var(--rose-soft)]/40 px-3 py-1 text-[var(--clay)]"
          style={{ fontSize: `${0.8 + ((i * 7) % 5) * 0.08}rem` }}
        >
          {w}
        </span>
      ))}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">아직 데이터가 없습니다.</p>;
}
