import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { useSurveys, useCustomers } from "@/lib/use-surveys";
import { listAllResponses, resultTypeForResponse } from "@/lib/survey-store";
import { ArrowRight, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const surveys = useSurveys();
  const customers = useCustomers();
  const navigate = useNavigate();

  const totalResponses = surveys.reduce((a, s) => a + s.responses.length, 0);
  const loungeCount = customers.filter((c) => c.inLounge).length;
  const paidCount = customers.filter((c) => c.payment_status === "paid").length;
  const recentResponses = listAllResponses().slice(0, 10);
  const recentCustomers = [...customers].slice(0, 10);

  return (
    <AdminShell
      title="대시보드"
      subtitle="설문·응답·고객 데이터를 한눈에 살펴봅니다."
      actions={
        <button
          onClick={() => navigate({ to: "/admin/new" })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:translate-y-[-1px]"
        >
          <Plus className="h-4 w-4" /> 새 설문 만들기
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="전체 설문" value={surveys.length} />
        <Stat label="전체 응답" value={totalResponses} />
        <Stat label="전체 고객" value={customers.length} />
        <Stat label="라운지 입장 고객" value={loungeCount} />
        <Stat label="유료결제 고객" value={paidCount} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="최근 응답" linkTo="/admin/responses" linkLabel="응답 관리로">
          {recentResponses.length === 0 ? (
            <Empty>아직 응답이 없습니다.</Empty>
          ) : (
            <ul className="divide-y divide-border/40">
              {recentResponses.map(({ survey, response }) => {
                const rt = resultTypeForResponse(survey, response);
                return (
                  <li key={response.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {response.customerName ?? "익명"}{" "}
                        <span className="text-muted-foreground">· {survey.title}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {new Date(response.submittedAt).toLocaleString()}
                        {rt && <> · {rt.title}</>}
                      </p>
                    </div>
                    {response.customerId && (
                      <Link
                        to="/admin/customers/$id"
                        params={{ id: response.customerId }}
                        className="shrink-0 text-[11px] text-[var(--clay)] hover:underline"
                      >
                        고객 →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="최근 고객" linkTo="/admin/customers" linkLabel="고객 관리로">
          {recentCustomers.length === 0 ? (
            <Empty>아직 고객이 없습니다.</Empty>
          ) : (
            <ul className="divide-y divide-border/40">
              {recentCustomers.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{c.name || "이름 없음"}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {c.email} · {new Date(c.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to="/admin/customers/$id"
                    params={{ id: c.id }}
                    className="shrink-0 text-[11px] text-[var(--clay)] hover:underline"
                  >
                    상세 →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-card">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl text-[var(--clay)]">{value}</p>
    </div>
  );
}

function Panel({
  title,
  linkTo,
  linkLabel,
  children,
}: {
  title: string;
  linkTo: "/admin/responses" | "/admin/customers";
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg text-foreground">{title}</h2>
        <Link to={linkTo} className="inline-flex items-center gap-1 text-xs text-[var(--clay)] hover:underline">
          {linkLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
