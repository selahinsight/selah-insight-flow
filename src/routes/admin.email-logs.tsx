import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { listEmailLogsServer, resendFreeResultEmailServer } from "@/lib/email.functions";
import { RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/email-logs")({
  component: EmailLogsPage,
});

type LogRow = Awaited<ReturnType<typeof listEmailLogsServer>>[number];

function statusBadgeClasses(status: string): string {
  if (status === "sent") return "bg-[var(--sage)]/50 text-[var(--clay)]";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-muted text-muted-foreground";
}

function EmailLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await listEmailLogsServer();
      setLogs(rows);
    } catch (err) {
      console.error("[selah] listEmailLogs failed", err);
      toast.error("이메일 로그를 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleResend(id: string) {
    if (resendingId) return;
    setResendingId(id);
    try {
      const res = await resendFreeResultEmailServer({ data: { logId: id } });
      if (res.status === "sent") toast.success("재발송했어요");
      else if (res.status === "not_configured") toast.error("Resend 설정이 필요해요");
      else toast.error(`재발송 실패: ${res.error ?? "알 수 없음"}`);
      await load();
    } catch (err) {
      console.error("[selah] resend failed", err);
      toast.error("재발송 중 오류가 발생했어요");
    } finally {
      setResendingId(null);
    }
  }

  return (
    <AdminShell title="이메일 로그" subtitle="무료 결과 이메일 발송 이력을 확인합니다.">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3 py-1.5 text-xs text-foreground/70 hover:bg-[var(--sand)]/40 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "불러오는 중..." : "새로고침"}
        </button>
        <span className="ml-auto text-xs text-muted-foreground">{logs.length}개의 로그</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/80 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--ivory)] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">발송일</th>
                <th className="px-4 py-3">고객</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">유형</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">오류</th>
                <th className="px-4 py-3 text-right">동작</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {loading ? "불러오는 중..." : "이메일 로그가 없습니다."}
                  </td>
                </tr>
              ) : (
                logs.map((r) => {
                  const displayName = r.customerName || r.customerNickname || "익명";
                  return (
                    <tr key={r.id} className="border-t border-border/40 hover:bg-[var(--ivory)]/60">
                      <td className="px-4 py-3 text-foreground/70">
                        {new Date(r.sentAt ?? r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-foreground/90">{displayName}</td>
                      <td className="px-4 py-3 text-foreground/80">{r.email}</td>
                      <td className="px-4 py-3 text-foreground/70">
                        {r.emailType === "free_result" ? "무료 결과" : r.emailType}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClasses(r.status)}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/60 max-w-[280px] truncate" title={r.errorMessage ?? ""}>
                        {r.errorMessage ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "failed" && r.emailType === "free_result" ? (
                          <button
                            onClick={() => void handleResend(r.id)}
                            disabled={resendingId === r.id}
                            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-white px-2.5 py-1 text-[11px] text-[var(--clay)] hover:bg-[var(--sand)]/40 disabled:opacity-60"
                          >
                            <Send className="h-3 w-3" />
                            {resendingId === r.id ? "발송 중" : "재발송"}
                          </button>
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
