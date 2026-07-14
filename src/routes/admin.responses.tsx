import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useSurveys, useCustomers } from "@/lib/use-surveys";
import {
  listAllResponses,
  refreshStore,
  resultTypeForResponse,
  setResponseInLounge,
} from "@/lib/survey-store";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/responses")({
  component: ResponsesPage,
});

const TEST_NAME_RE = /(testbot|테스트|^test$|^test\s|\stest$)/i;
function isTestName(name?: string | null): boolean {
  if (!name) return false;
  return TEST_NAME_RE.test(name.trim());
}

function ResponsesPage() {
  const surveys = useSurveys();
  const customers = useCustomers();
  const [surveyId, setSurveyId] = useState<string>("all");
  const [hideTest, setHideTest] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);

  // depend on surveys/customers so this re-derives on change
  const rows = useMemo(() => {
    void surveys;
    void customers;
    const all = listAllResponses();
    return all
      .filter((x) => (surveyId === "all" ? true : x.survey.id === surveyId))
      .filter((x) => {
        if (!hideTest) return true;
        const c = customers.find((cc) => cc.id === x.response.customerId);
        return !isTestName(x.response.customerName) && !isTestName(c?.name) && !isTestName(c?.nickname);
      });
  }, [surveys, customers, surveyId, hideTest]);

  const customerByEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers) m.set(c.email, c.id);
    return m;
  }, [customers]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshStore();
      toast.success("최신 응답을 불러왔어요");
    } catch {
      toast.error("불러오기에 실패했어요");
    } finally {
      setRefreshing(false);
    }
  }

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
        <label className="ml-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={hideTest}
            onChange={(e) => setHideTest(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--clay)]"
          />
          테스트 데이터 숨기기
        </label>
        <button
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3 py-1.5 text-xs text-foreground/70 hover:bg-[var(--sand)]/40 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "새로고침 중..." : "새로고침"}
        </button>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length}개의 응답</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/80 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--ivory)] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">응답 ID</th>
                <th className="px-4 py-3">진단명</th>
                <th className="px-4 py-3">응답자</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">결과 유형</th>
                <th className="px-4 py-3">제출 시간</th>
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
                  const customer = customers.find((c) => c.id === response.customerId);
                  const displayName =
                    response.customerName ?? customer?.name ?? customer?.nickname ?? "익명";
                  const email = response.customerEmail ?? customer?.email ?? "";
                  const emailStatus = email ? "입력됨" : "미입력";
                  const isTest =
                    isTestName(response.customerName) ||
                    isTestName(customer?.name) ||
                    isTestName(customer?.nickname);
                  const cid =
                    response.customerId ??
                    (email ? customerByEmail.get(email.toLowerCase()) : undefined);
                  return (
                    <tr key={response.id} className="border-t border-border/40 hover:bg-[var(--ivory)]/60">
                      <td className="px-4 py-3 font-mono text-[11px] text-foreground/60">
                        {response.id}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">{survey.title}</td>
                      <td className="px-4 py-3 text-foreground/90">
                        <div className="flex items-center gap-2">
                          <span>{displayName}</span>
                          {isTest && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              테스트
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            email
                              ? "bg-[var(--sage)]/40 text-[var(--clay)]"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {emailStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/90">{rt?.title ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground/70">
                        {new Date(response.submittedAt).toLocaleString()}
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
