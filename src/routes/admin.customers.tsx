import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useSurveys, useCustomers } from "@/lib/use-surveys";
import { listAllResponses, resultTypeForResponse } from "@/lib/survey-store";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersLayout,
});

function CustomersLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Nested routes (e.g. /admin/customers/$id) render via Outlet
  if (pathname !== "/admin/customers" && pathname !== "/admin/customers/") {
    return <Outlet />;
  }
  return <CustomersList />;
}

function CustomersList() {
  const surveys = useSurveys();
  const customers = useCustomers();
  const [q, setQ] = useState("");
  const [surveyId, setSurveyId] = useState("all");
  const [rtFilter, setRtFilter] = useState("all");
  const [lounge, setLounge] = useState("all");
  const [paid, setPaid] = useState("all");

  const responsesByCustomer = useMemo(() => {
    const m = new Map<string, { surveyId: string; resultTypeId?: string; submittedAt: number }[]>();
    for (const { survey, response } of listAllResponses()) {
      if (!response.customerId) continue;
      const arr = m.get(response.customerId) ?? [];
      const rt = resultTypeForResponse(survey, response);
      arr.push({ surveyId: survey.id, resultTypeId: rt?.id, submittedAt: response.submittedAt });
      m.set(response.customerId, arr);
    }
    return m;
  }, [surveys, customers]);

  const allResultTypes = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of surveys) for (const r of s.resultTypes ?? []) map.set(r.id, r.title);
    return map;
  }, [surveys]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return customers.filter((c) => {
      if (term && !c.name.toLowerCase().includes(term) && !c.email.toLowerCase().includes(term))
        return false;
      const resps = responsesByCustomer.get(c.id) ?? [];
      if (surveyId !== "all" && !resps.some((r) => r.surveyId === surveyId)) return false;
      const latest = resps.sort((a, b) => b.submittedAt - a.submittedAt)[0];
      if (rtFilter !== "all" && latest?.resultTypeId !== rtFilter) return false;
      if (lounge === "yes" && !c.inLounge) return false;
      if (lounge === "no" && c.inLounge) return false;
      if (paid === "paid" && c.payment_status !== "paid") return false;
      if (paid === "unpaid" && c.payment_status !== "unpaid") return false;
      return true;
    });
  }, [customers, q, surveyId, rtFilter, lounge, paid, responsesByCustomer]);

  return (
    <AdminShell title="고객 관리" subtitle="이메일 기준으로 통합된 고객 데이터를 관리합니다.">
      <div className="mb-4 grid gap-3 rounded-2xl border border-border/60 bg-white/70 p-4 shadow-card md:grid-cols-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름/이메일 검색"
          className="rounded-full border border-border/60 bg-white px-3 py-2 text-sm md:col-span-2"
        />
        <select value={surveyId} onChange={(e) => setSurveyId(e.target.value)} className="rounded-full border border-border/60 bg-white px-3 py-2 text-sm">
          <option value="all">설문 전체</option>
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
        <select value={rtFilter} onChange={(e) => setRtFilter(e.target.value)} className="rounded-full border border-border/60 bg-white px-3 py-2 text-sm">
          <option value="all">결과 유형 전체</option>
          {Array.from(allResultTypes.entries()).map(([id, title]) => (
            <option key={id} value={id}>{title}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <select value={lounge} onChange={(e) => setLounge(e.target.value)} className="flex-1 rounded-full border border-border/60 bg-white px-3 py-2 text-sm">
            <option value="all">라운지 전체</option>
            <option value="yes">입장</option>
            <option value="no">미입장</option>
          </select>
          <select value={paid} onChange={(e) => setPaid(e.target.value)} className="flex-1 rounded-full border border-border/60 bg-white px-3 py-2 text-sm">
            <option value="all">결제 전체</option>
            <option value="paid">결제</option>
            <option value="unpaid">미결제</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/80 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--ivory)] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">설문 수</th>
                <th className="px-4 py-3">최근 제출일</th>
                <th className="px-4 py-3">대표 결과 유형</th>
                <th className="px-4 py-3 text-center">라운지</th>
                <th className="px-4 py-3 text-center">결제</th>
                <th className="px-4 py-3 text-right">상세</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">고객이 없습니다.</td></tr>
              ) : (
                rows.map((c) => {
                  const resps = (responsesByCustomer.get(c.id) ?? []).sort((a, b) => b.submittedAt - a.submittedAt);
                  const latest = resps[0];
                  return (
                    <tr key={c.id} className="border-t border-border/40 hover:bg-[var(--ivory)]/60">
                      <td className="px-4 py-3 text-foreground/90">{c.name || "이름 없음"}</td>
                      <td className="px-4 py-3 text-foreground/70">{c.email}</td>
                      <td className="px-4 py-3 text-foreground/80">{resps.length}</td>
                      <td className="px-4 py-3 text-foreground/70">
                        {latest ? new Date(latest.submittedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground/90">
                        {latest?.resultTypeId ? allResultTypes.get(latest.resultTypeId) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">{c.inLounge ? "✓" : "—"}</td>
                      <td className="px-4 py-3 text-center">{c.payment_status === "paid" ? "✓" : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/admin/customers/$id"
                          params={{ id: c.id }}
                          className="text-xs text-[var(--clay)] hover:underline"
                        >
                          고객 상세 →
                        </Link>
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
