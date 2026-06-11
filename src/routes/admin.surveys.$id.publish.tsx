import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, SurveyTabs } from "@/components/admin/admin-shell";
import { useSurvey } from "@/lib/use-surveys";
import { upsertSurvey } from "@/lib/survey-store";
import { Copy, Eye, Globe2, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/surveys/$id/publish")({
  component: Publish,
});

function Publish() {
  const { id } = Route.useParams();
  const survey = useSurvey(id);
  if (!survey) return <AdminShell title="설문 없음">{null}</AdminShell>;

  const url = typeof window !== "undefined" ? `${window.location.origin}/s/${survey.slug}` : `/s/${survey.slug}`;
  const isPublished = survey.status === "published";

  return (
    <AdminShell title={survey.title} subtitle="공개 링크를 발행하고 응답을 수집합니다.">
      <SurveyTabs id={id} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-2xl border border-border/60 bg-white/70 p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl text-foreground">공개 상태</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  공개로 전환하면 응답자가 링크로 설문에 참여할 수 있습니다.
                </p>
              </div>
              <button
                onClick={() =>
                  upsertSurvey({ ...survey, status: isPublished ? "draft" : "published" })
                }
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium ${
                  isPublished
                    ? "bg-[var(--sage)]/50 text-[var(--clay)]"
                    : "bg-[var(--clay)] text-white shadow-soft"
                }`}
              >
                {isPublished ? <Globe2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {isPublished ? "공개 중" : "공개로 전환"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-white/70 p-6 shadow-card">
            <h3 className="font-serif text-xl text-foreground">공개 링크</h3>
            <p className="mt-1 text-sm text-muted-foreground">이 링크를 공유해 응답을 받으세요.</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-[var(--ivory)] px-4 py-3 font-mono text-xs text-foreground/80">
              <span className="flex-1 truncate">{url}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast.success("링크가 복사되었습니다");
                }}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs shadow"
              >
                <Copy className="h-3 w-3" /> 복사
              </button>
              <a
                href={`/s/${survey.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--clay)] px-3 py-1.5 text-xs text-white"
              >
                <Eye className="h-3 w-3" /> 미리보기
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border/70 bg-white/50 p-6">
            <h3 className="font-serif text-lg text-foreground">결제 (준비 중)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              유료 상세 결과지 결제는 다음 단계에서 연결됩니다. 지금은 "상세 결과지 신청하기"
              버튼으로 수집됩니다.
            </p>
          </div>
        </div>

        <aside className="lg:col-span-2">
          <div className="rounded-3xl bg-gradient-rose p-6 text-white shadow-soft">
            <p className="font-serif text-lg">설문 미리보기</p>
            <p className="mt-1 text-sm text-white/85">
              모바일에서 응답자가 보게 될 화면을 확인해 보세요.
            </p>
            <a
              href={`/s/${survey.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-[var(--clay)]"
            >
              새 창에서 열기
            </a>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
