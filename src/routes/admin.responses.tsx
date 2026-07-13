import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useSurveys, useCustomers } from "@/lib/use-surveys";
import {
  listAllResponses,
  resultTypeForResponse,
  setResponseInLounge,
} from "@/lib/survey-store";

export const Route = createFileRoute("/admin/responses")({
  component: ResponsesPage,
});

function ResponsesPage() {
  const surveys = useSurveys();
  const customers = useCustomers();
  const [surveyId, setSurveyId] = useState<string>("all");

  // depend on surveys/customers so this re-derives on change
  const rows = useMemo(() => {
    void surveys;
    void customers;
    const all = listAllResponses();
    return surveyId === "all" ? all : all.filter((x) => x.survey.id === surveyId);
  }, [surveys, customers, surveyId]);

  const customerByEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers) m.set(c.email, c.id);
    return m;
  }, [customers]);

  return (
    <AdminShell title="응답 관리" subtitle="설문 응답을 통합해서 확인하고 라운지 입장 여부를 관리합니다.">
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-white/70 p-4 shadow-card">
        <label className="text-xs text-muted-foreground">설문</label>
        <select
          value={surveyId}
          onChange={(e) => setSurveyId(e.target.value)}
          className="rounded-full border border-border/60 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">전체 설문</option>
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length}개의 응답</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/80 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--ivory)] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">응답자</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">설문</th>
                <th className="px-4 py-3">제출일시</th>
                <th className="px-4 py-3">결과 유형</th>
                <th className="px-4 py-3">주요 결과 요약</th>
                <th className="px-4 py-3 text-center">라운지</th>
                <th className="px-4 py-3 text-right">고객</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    응답이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map(({ survey, response }) => {
                  const rt = resultTypeForResponse(survey, response);
                  const cid =
                    response.customerId ??
                    (response.customerEmail
                      ? customerByEmail.get(response.customerEmail.toLowerCase())
                      : undefined);
                  return (
                    <tr key={response.id} className="border-t border-border/40 hover:bg-[var(--ivory)]/60">
                      <td className="px-4 py-3 text-foreground/90">{response.customerName ?? "익명"}</td>
                      <td className="px-4 py-3 text-foreground/70">{response.customerEmail ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground/70">{survey.title}</td>
                      <td className="px-4 py-3 text-foreground/70">
                        {new Date(response.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-foreground/90">{rt?.title ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground/70">
                        <span className="line-clamp-2">{rt?.summary ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={!!response.inLounge}
                          onChange={(e) =>
                            setResponseInLounge(survey.id, response.id, e.target.checked)
                          }
                          className="h-4 w-4 accent-[var(--clay)]"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {cid ? (
                          <Link
                            to="/admin/customers/$id"
                            params={{ id: cid }}
                            className="text-xs text-[var(--clay)] hover:underline"
                          >
                            고객 상세 →
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
