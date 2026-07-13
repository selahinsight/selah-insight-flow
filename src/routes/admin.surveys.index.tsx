import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { useSurveys } from "@/lib/use-surveys";
import {
  upsertSurvey,
  softDeleteSurvey,
  STATUS_LABEL,
  SURVEY_CATEGORIES,
  categoryLabel,
  type Survey,
} from "@/lib/survey-store";
import {
  BarChart3,
  Pencil,
  Plus,
  Link2,
  XCircle,
  ExternalLink,
  Trash2,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/surveys/")({
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
type ViewMode = "card" | "list";

const VIEW_KEY = "selah.viewMode";

function Dashboard() {
  const surveys = useSurveys();
  const navigate = useNavigate();

  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [minResponses, setMinResponses] = useState<string>("");
  const [recentFrom, setRecentFrom] = useState<string>("");
  const [view, setView] = useState<ViewMode>("card");
  const [pendingDelete, setPendingDelete] = useState<Survey | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(VIEW_KEY) as ViewMode | null;
    if (v === "card" || v === "list") setView(v);
  }, []);

  function changeView(v: ViewMode) {
    setView(v);
    if (typeof window !== "undefined") localStorage.setItem(VIEW_KEY, v);
  }

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

  function toggleClose(s: Survey) {
    upsertSurvey({ ...s, status: s.status === "closed" ? "draft" : "closed" });
    toast.success(s.status === "closed" ? "다시 제작중으로 변경" : "설문을 종료했습니다");
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    softDeleteSurvey(pendingDelete.id);
    toast.success("설문이 삭제되었습니다");
    setPendingDelete(null);
  }

  const actions = {
    onCopy: copyLink,
    onPreview: (s: Survey) => window.open(`/s/${s.slug}`, "_blank"),
    onResults: (s: Survey) =>
      navigate({ to: "/admin/surveys/$id/analytics", params: { id: s.id } }),
    onEdit: (s: Survey) =>
      navigate({ to: "/admin/surveys/$id/edit", params: { id: s.id } }),
    onClose: toggleClose,
    onDelete: (s: Survey) => setPendingDelete(s),
  };

  return (
    <AdminShell
      title="설문지 관리"
      subtitle=""
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
      <div className="mb-4 rounded-2xl border border-border/60 bg-white/70 p-4 shadow-card">
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

      {/* View toggle */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filtered.length}개의 설문
        </p>
        <div className="inline-flex rounded-full border border-border/60 bg-white/70 p-1 text-xs">
          <button
            onClick={() => changeView("card")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
              view === "card"
                ? "bg-[var(--clay)] text-white shadow-soft"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> 카드 보기
          </button>
          <button
            onClick={() => changeView("list")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
              view === "list"
                ? "bg-[var(--clay)] text-white shadow-soft"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <ListIcon className="h-3.5 w-3.5" /> 리스트 보기
          </button>
        </div>
      </div>

      <style>{`.filter-input{width:100%;border:1px solid hsl(var(--border));background:#fff;border-radius:9999px;padding:0.5rem 0.9rem;font-size:0.8rem;color:hsl(var(--foreground));} .rose-btn{color:#9b6b6b;border-color:rgba(155,107,107,0.35);} .rose-btn:hover{background:rgba(155,107,107,0.08);}`}</style>

      {filtered.length === 0 ? (
        surveys.length === 0 ? <EmptyState /> : <NoMatchState />
      ) : view === "card" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SurveyCard key={s.id} s={s} actions={actions} />
          ))}
        </div>
      ) : (
        <SurveyList rows={filtered} actions={actions} />
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>설문을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 설문을 삭제할까요? 삭제하면 설문과 연결된 응답 데이터도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#9b6b6b] text-white hover:bg-[#8a5d5d]"
            >
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

interface RowActions {
  onCopy: (slug: string) => void;
  onPreview: (s: Survey) => void;
  onResults: (s: Survey) => void;
  onEdit: (s: Survey) => void;
  onClose: (s: Survey) => void;
  onDelete: (s: Survey) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function statusClassFor(s: Survey["status"]) {
  return s === "published"
    ? "bg-[var(--sage)]/50 text-[var(--clay)]"
    : s === "closed"
      ? "bg-muted text-muted-foreground"
      : "bg-[var(--sand)]/70 text-foreground/70";
}

function SurveyCard({ s, actions }: { s: Survey; actions: RowActions }) {
  const last = s.responses[s.responses.length - 1];

  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-white/80 p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--rose-soft)]/30 px-2.5 py-1 text-[11px] text-[var(--clay)]">
          {categoryLabel(s.category)}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] ${statusClassFor(s.status)}`}>
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

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Meta label="응답" value={String(s.responses.length)} />
        <Meta label="최근 응답" value={last ? new Date(last.submittedAt).toLocaleDateString() : "—"} />
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => actions.onCopy(s.slug)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--clay)] px-3.5 py-1.5 text-xs font-medium text-white shadow-soft"
        >
          <Link2 className="h-3.5 w-3.5" /> URL
        </button>
        <button
          onClick={() => actions.onPreview(s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3.5 py-1.5 text-xs text-foreground/70 hover:bg-[var(--sand)]/40"
        >
          <ExternalLink className="h-3.5 w-3.5" /> 미리보기
        </button>
        <button
          onClick={() => actions.onResults(s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3.5 py-1.5 text-xs text-foreground/70 hover:bg-[var(--sand)]/40"
        >
          <BarChart3 className="h-3.5 w-3.5" /> 응답
        </button>
        <button
          onClick={() => actions.onEdit(s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3.5 py-1.5 text-xs text-foreground/70 hover:bg-[var(--sand)]/40"
        >
          <Pencil className="h-3.5 w-3.5" /> 편집
        </button>
        <button
          onClick={() => actions.onClose(s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3.5 py-1.5 text-xs text-foreground/70 hover:bg-[var(--sand)]/40"
        >
          <XCircle className="h-3.5 w-3.5" />
          {s.status === "closed" ? "재오픈" : "닫기"}
        </button>
        <button
          onClick={() => actions.onDelete(s)}
          className="rose-btn ml-auto inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" /> 삭제
        </button>
      </div>
    </div>
  );
}

function SurveyList({ rows, actions }: { rows: Survey[]; actions: RowActions }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/80 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--ivory)] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">설문 제목</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">응답</th>
              <th className="px-4 py-3">최근 응답일</th>
              <th className="px-4 py-3">생성일</th>
              <th className="px-4 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const last = s.responses[s.responses.length - 1];
              return (
                <tr key={s.id} className="border-t border-border/40 hover:bg-[var(--ivory)]/60">
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/surveys/$id/edit"
                      params={{ id: s.id }}
                      className="font-medium text-foreground hover:text-[var(--clay)]"
                    >
                      {s.title}
                    </Link>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {categoryLabel(s.category)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${statusClassFor(s.status)}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground/80">{s.responses.length}</td>
                  <td className="px-4 py-3 text-foreground/70">
                    {last ? new Date(last.submittedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <IconBtn title="URL 복사" onClick={() => actions.onCopy(s.slug)}>
                        <Link2 className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn title="미리보기" onClick={() => actions.onPreview(s)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn title="응답 보기" onClick={() => actions.onResults(s)}>
                        <BarChart3 className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn title="편집" onClick={() => actions.onEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn
                        title={s.status === "closed" ? "재오픈" : "닫기"}
                        onClick={() => actions.onClose(s)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </IconBtn>
                      <button
                        title="삭제"
                        onClick={() => actions.onDelete(s)}
                        className="rose-btn inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-white text-foreground/70 hover:bg-[var(--sand)]/40"
    >
      {children}
    </button>
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
