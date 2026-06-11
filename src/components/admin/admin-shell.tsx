import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, BarChart3, FilePlus2, Home, LayoutDashboard, ListChecks, Settings2 } from "lucide-react";

const nav = [
  { to: "/", label: "메인", icon: Home, exact: true },
  { to: "/admin", label: "내 설문", icon: LayoutDashboard, exact: true },
  { to: "/admin/new", label: "새 설문 만들기", icon: FilePlus2 },
];

export function AdminShell({
  children,
  title,
  subtitle,
  actions,
  showBack = false,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showBack?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  return (
    <div className="flex min-h-screen w-full bg-[var(--ivory)] text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-[var(--cream)] px-5 py-8 md:flex md:flex-col">
        <Link to="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 40 40" className="text-[var(--clay)]">
            <path
              d="M20 4 C 30 8, 36 16, 32 26 C 28 34, 16 36, 10 30 C 4 24, 6 12, 14 8 C 18 6, 22 4, 20 4 Z"
              fill="none" stroke="currentColor" strokeWidth="1.2"
            />
          </svg>
          <span className="font-serif text-lg tracking-[0.25em] text-[var(--clay)]">SELAH</span>
        </Link>
        <p className="mt-1 text-[11px] text-muted-foreground">Studio</p>

        <nav className="mt-10 flex flex-col gap-1">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-[var(--sand)] text-[var(--clay)]" : "text-foreground/70 hover:bg-white"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 rounded-2xl bg-gradient-clay p-4 text-xs text-white/95 shadow-soft">
          <p className="font-serif text-base">내부 Tool</p>
          <p className="mt-1 text-white/80">
            ChatGPT에서 만든 설문 JSON을 붙여넣어 URL을 발행하고 응답을 관리합니다.
          </p>
        </div>

        <div className="mt-auto pt-8 text-[11px] text-muted-foreground">© SELAH</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-[var(--cream)]/60 px-6 py-5 md:px-10">
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                onClick={() => router.history.back()}
                className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-white text-foreground/70 transition hover:bg-[var(--sand)]/60"
                title="이전 화면"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h1 className="font-serif text-2xl text-foreground md:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}

export function SurveyTabs({ id }: { id: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: `/admin/surveys/${id}/edit`, label: "편집", icon: ListChecks },
    { to: `/admin/surveys/${id}/publish`, label: "공개 설정", icon: Settings2 },
    { to: `/admin/surveys/${id}/analytics`, label: "응답 보기", icon: BarChart3 },
  ];
  return (
    <div className="mb-8 inline-flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-card">
      {tabs.map((t) => {
        const active = pathname === t.to;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
              active ? "bg-[var(--clay)] text-white shadow" : "text-foreground/70 hover:bg-[var(--sand)]/50"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
