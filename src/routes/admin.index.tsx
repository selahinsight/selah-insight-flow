import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useSurveys } from "@/lib/use-surveys";
import {
  upsertSurvey,
  STATUS_LABEL,
  SURVEY_CATEGORIES,
  categoryLabel,
  type Survey,
} from "@/lib/survey-store";
import { BarChart3, Pencil, Plus, Link2, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

type CategoryFilter = "all" | Survey["category"];
type StatusFilter = "all" | Survey["status"];
type SortKey =
  | "newest"
  | "oldest"
  | "responses_desc"
  | "responses_asc"
  | "last_response"
  | "title";

function Dashboard() {
  const surveys = useSurveys();
  const navigate = useNavigate();

  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [minResponses, setMinResponses] = useState<string>("");
  const [recentFrom, setRecentFrom] = useState<string>("");

  const filtered = useMemo(() => {
    const list = surveys.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (status !== "all" && s.status !== status) return false;
      if (createdFrom) {
        const t = new Date(createdFrom).getTime();
        if (s.createdAt < t) return false;
      }
      if (minResponses) {
        const n = Number(minResponses);
        if (!isNaN(n) && s.responses.length < n) return false;
      }
      if (recentFrom) {
        const t = new Date(recentFrom).getTime();
        const last = s.responses[s.responses.length - 1]?.submittedAt ?? 0;
        if (last < t) return false;
      }
      return true;
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      const aLast = a.responses[a.responses.length - 1]?.submittedAt ?? 0;
      const bLast = b.responses[b.responses.length - 1]?.submittedAt ?? 0;
      switch (sort) {
        case "oldest":
          return a.createdAt - b.createdAt;
        case "responses_desc":
          return b.responses.length - a.responses.length;
        case "responses_asc":
          return a.responses.length - b.responses.length;
        case "last_response":
          return bLast - aLast;
        case "title":
          return a.title.localeCompare(b.title, "ko");
        case "newest":
        default:
          return b.createdAt - a.createdAt;
      }
    });
    return sorted;
  }, [surveys, category, status, sort, createdFrom, minResponses, recentFrom]);

  const totalResponses = surveys.reduce((a, s) => a + s.responses.length, 0);
  const published = surveys.filter((s) => s.status === "published").length;

  function copyLink(slug: string) {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("공유 URL이 복사되었습니다");
  }

  return (
    <AdminShell
      title="내 설문 작업실"
      subtitle="설문을 유형별로 모아 보고, 응답을 관리합니다."
      actions={
        <button
          onClick={() => navigate({ to: "/admin/new" })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:translate-y-[-1px]"
        >
          <Plus className="h-4 w-4" /> 새 설문 만들기
        </button>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="전체 설문" value={surveys.length} />
        <Stat label="설문중" value={published} />
        <Stat label="누적 응답" value={totalResponses} />
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-border/60 bg-white/70 p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Field label="설문 유형">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryFilter)}
              className="filter-input"
            >
              <option value="all">전체</option>
              {SURVEY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="설문 상태">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="filter-input"
            >
              <option value="all">전체</option>
              <option value="draft">제작중</option>
              <option value="published">설문중</option>
              <option value="closed">종료</option>
            </select>
          </Field>
          <Field label="생성일 (이후)">
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="filter-input"
            />
          </Field>
          <Field label="최소 응답 수">
            <input
              type="number"
              min={0}
              value={minResponses}
              onChange={(e) => setMinResponses(e.target.value)}
              className="filter-input"
              placeholder="0"
            />
          </Field>
          <Field label="최근 응답일 (이후)">
            <input
              type="date"
              value={recentFrom}
              onChange={(e) => setRecentFrom(e.target.value)}
              className="filter-input"
            />
          </Field>
          <Field label="정렬">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="filter-input"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="responses_desc">응답 많은순</option>
              <option value="responses_asc">응답 적은순</option>
              <option value="last_response">최근 응답순</option>
              <option value="title">제목순</option>
            </select>
          </Field>
        </div>
      </div>

      <style>{`.filter-input{width:100%;border:1px solid hsl(var(--border));background:#fff;border-radius:9999px;padding:0.5rem 0.9rem;font-size:0.8rem;color:hsl(var(--foreground));}`}</style>

      {filtered.length === 0 ? (
        surveys.length === 0 ? <EmptyState /> : <NoMatchState />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SurveyCard
              key={s.id}
              s={s}
              onCopy={copyLink}
              onResults={() =>
                navigate({ to: "/admin/surveys/$id/analytics", params: { id: s.id } })
              }
              onEdit={() =>
                navigate({ to: "/admin/surveys/$id/edit", params: { id: s.id } })
              }
              onClose={() => {
                upsertSurvey({
                  ...s,
                  status: s.status === "closed" ? "draft" : "closed",
                });
                toast.success(s.status === "closed" ? "다시 제작중으로 변경" : "설문을 종료했습니다");
              }}
            />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SurveyCard({
  s,
  onCopy,
  onResults,
  onEdit,
  onClose,
}: {
  s: Survey;
  onCopy: (slug: string) => void;
  onResults: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const last = s.responses[s.responses.length - 1];
  const statusClass =
    s.status === "published"
      ? "bg-[var(--sage)]/50 text-[var(--clay)]"
      : s.status === "closed"
        ? "bg-muted text-muted-foreground"
        : "bg-[var(--sand)]/70 text-foreground/70";

  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-white/80 p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--rose-soft)]/30 px-2.5 py-1 text-[11px] text-[var(--clay)]">
          {categoryLabel(s.category)}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] ${statusClass}`}>
          {STATUS_LABEL[s.status]}
        </span>
      </div>

      <Link
        to="/admin/surveys/$id/edit"
        params={{ id: s.id }}
        className="font-serif text-lg leading-snug text-foreground hover:text-[var(--clay)]"
      >
        {s.title}
      </Link>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Meta label="응답" value={String(s.responses.length)} />
        <Meta label="생성일" value={new Date(s.createdAt).toLocaleDateString()} />
        <Meta label="최근 응답" value={last ? new Date(last.submittedAt).toLocaleDateString() : "—"} />
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onCopy(s.slug)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--clay)] px-3.5 py-1.5 text-xs font-medium text-white shadow-soft"
        >
          <Link2 className="h-3.5 w-3.5" /> 공유 URL
        </button>
        <a
          href={`/s/${s.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3.5 py-1.5 text-xs text-foreground/70 hover:bg-[var(--sand)]/40"
          title="새 탭에서 응답 화면 열기"
        >
          <ExternalLink className="h-3.5 w-3.5" /> 열기
        </a>
        <button
          onClick={onResults}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3.5 py-1.5 text-xs text-foreground/70 hover:bg-[var(--sand)]/40"
        >
          <BarChart3 className="h-3.5 w-3.5" /> 결과 보기
        </button>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3.5 py-1.5 text-xs text-foreground/70 hover:bg-[var(--sand)]/40"
        >
          <Pencil className="h-3.5 w-3.5" /> 수정
        </button>
        <button
          onClick={onClose}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-white px-3.5 py-1.5 text-xs text-destructive hover:bg-destructive/5"
          title={s.status === "closed" ? "다시 제작중으로" : "설문 종료"}
        >
          <XCircle className="h-3.5 w-3.5" />
          {s.status === "closed" ? "재오픈" : "종료"}
        </button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--ivory)] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground/90">{value}</dd>
    </div>
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

function NoMatchState() {
  return (
    <div className="rounded-3xl border border-dashed border-border/80 bg-white/50 p-10 text-center shadow-card">
      <p className="font-serif text-xl text-foreground">조건에 맞는 설문이 없습니다</p>
      <p className="mt-2 text-sm text-muted-foreground">필터를 조정해 보세요.</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border/80 bg-white/50 p-12 text-center shadow-card">
      <p className="font-serif text-2xl text-foreground">아직 만든 설문이 없습니다</p>
      <p className="mt-2 text-sm text-muted-foreground">
        ChatGPT에서 만든 설문 JSON을 붙여넣어 첫 설문을 만들어 보세요.
      </p>
      <Link
        to="/admin/new"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--clay)] px-6 py-2.5 text-sm font-medium text-white shadow-soft"
      >
        <Plus className="h-4 w-4" /> 새 설문 만들기
      </Link>
    </div>
  );
}
