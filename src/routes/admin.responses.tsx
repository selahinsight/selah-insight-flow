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
import {
  deleteSurveyResponseServer,
  deleteTestSurveyResponsesServer,
} from "@/lib/admin.functions";
import { RefreshCw, Trash2 } from "lucide-react";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);

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

  async function handleDelete(responseId: string) {
    if (deletingId) return;
    setDeletingId(responseId);
    try {
      const res = await deleteSurveyResponseServer({
        data: { responseId, alsoDeleteOrphanTestCustomer: true },
      });
      toast.success(
        res.customerDeleted ? "응답과 테스트 고객을 삭제했어요" : "응답을 삭제했어요",
      );
      await refreshStore();
    } catch (err) {
      console.error("[selah] deleteSurveyResponse failed", err);
      toast.error("삭제 중 오류가 발생했어요");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function handleBulkDeleteTest() {
    if (bulkRunning) return;
    setBulkRunning(true);
    try {
      const res = await deleteTestSurveyResponsesServer({
        data: { alsoDeleteOrphanTestCustomers: true },
      });
      toast.success(
        `테스트 응답 ${res.deletedResponses}건 · 테스트 고객 ${res.deletedCustomers}명 삭제`,
      );
      await refreshStore();
    } catch (err) {
      console.error("[selah] deleteTestSurveyResponses failed", err);
      toast.error("일괄 삭제 중 오류가 발생했어요");
    } finally {
      setBulkRunning(false);
      setConfirmBulk(false);
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
        <button
          onClick={() => setConfirmBulk(true)}
          disabled={bulkRunning}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" />
          테스트 데이터 삭제
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
                <th className="px-4 py-3 text-right">삭제</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
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
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirmDeleteId(response.id)}
                          disabled={deletingId === response.id}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2.5 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 className="h-3 w-3" />
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDeleteId && (
        <ConfirmModal
          title="응답 삭제"
          message="이 응답을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          confirmLabel={deletingId ? "삭제 중..." : "삭제"}
          confirmDisabled={!!deletingId}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => void handleDelete(confirmDeleteId)}
        />
      )}
      {confirmBulk && (
        <ConfirmModal
          title="테스트 응답 삭제"
          message="테스트 응답만 삭제합니다. 실제 고객 응답은 삭제하지 않습니다. 진행할까요?"
          confirmLabel={bulkRunning ? "삭제 중..." : "삭제"}
          confirmDisabled={bulkRunning}
          onCancel={() => setConfirmBulk(false)}
          onConfirm={() => void handleBulkDeleteTest()}
        />
      )}
    </AdminShell>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmDisabled,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-foreground/70">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full border border-border/60 bg-white px-3 py-1.5 text-xs text-foreground/70 hover:bg-[var(--sand)]/40"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-full bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
