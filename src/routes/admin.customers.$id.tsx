import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { useCustomer, useSurveys } from "@/lib/use-surveys";
import {
  listResponsesForCustomer,
  resultTypeForResponse,
  updateCustomer,
} from "@/lib/survey-store";

export const Route = createFileRoute("/admin/customers/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  useSurveys(); // hydrate
  const customer = useCustomer(id);

  if (!customer) {
    return (
      <AdminShell title="고객 없음" showBack>
        <p className="text-sm text-muted-foreground">해당 고객을 찾을 수 없습니다.</p>
        <Link to="/admin/customers" className="mt-4 inline-block text-sm text-[var(--clay)] hover:underline">
          ← 고객 목록으로
        </Link>
      </AdminShell>
    );
  }

  const history = listResponsesForCustomer(customer.id);
  const paidDateInput = customer.paid_at
    ? new Date(customer.paid_at).toISOString().slice(0, 10)
    : "";

  return (
    <AdminShell title={customer.name || "이름 없음"} subtitle={customer.email} showBack>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-card md:col-span-2">
          <h2 className="mb-3 font-serif text-lg">참여한 설문</h2>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">아직 응답 이력이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {history.map(({ survey, response }) => {
                const rt = resultTypeForResponse(survey, response);
                return (
                  <li key={response.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{survey.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(response.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-foreground/80">
                      결과 유형: <span className="text-[var(--clay)]">{rt?.title ?? "—"}</span>
                    </p>
                    {rt?.summary && (
                      <p className="mt-1 text-sm text-muted-foreground">{rt.summary}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-card">
            <h3 className="mb-3 font-serif text-base">라운지</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={customer.inLounge}
                onChange={(e) => updateCustomer(customer.id, { inLounge: e.target.checked })}
                className="h-4 w-4 accent-[var(--clay)]"
              />
              라운지 입장 여부
            </label>
          </div>

          <div className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-card">
            <h3 className="mb-3 font-serif text-base">결제</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={customer.payment_status === "paid"}
                onChange={(e) =>
                  updateCustomer(customer.id, {
                    payment_status: e.target.checked ? "paid" : "unpaid",
                    paid_at: e.target.checked ? customer.paid_at ?? Date.now() : null,
                  })
                }
                className="h-4 w-4 accent-[var(--clay)]"
              />
              유료결제 여부
            </label>
            <label className="mt-3 block text-xs text-muted-foreground">결제일</label>
            <input
              type="date"
              value={paidDateInput}
              onChange={(e) => {
                const v = e.target.value;
                updateCustomer(customer.id, {
                  paid_at: v ? new Date(v).getTime() : null,
                });
              }}
              className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
            />
            <p className="mt-3 text-[11px] text-muted-foreground">
              * 결제 연동은 추후 예정 (payment_provider / payment_id 필드 준비됨)
            </p>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
