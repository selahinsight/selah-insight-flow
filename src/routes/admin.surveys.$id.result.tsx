import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, SurveyTabs } from "@/components/admin/admin-shell";
import { useSurvey } from "@/lib/use-surveys";
import { upsertSurvey, type ResultType } from "@/lib/survey-store";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/surveys/$id/result")({
  component: ResultEditor,
});

function ResultEditor() {
  const { id } = Route.useParams();
  const survey = useSurvey(id);
  if (!survey) return <AdminShell title="설문 없음">{null}</AdminShell>;

  function patch(p: Partial<typeof survey>) {
    upsertSurvey({ ...survey!, ...p });
  }
  function patchType(i: number, p: Partial<ResultType>) {
    const t = [...survey!.resultTypes];
    t[i] = { ...t[i], ...p };
    patch({ resultTypes: t });
  }

  return (
    <AdminShell title={survey.title} subtitle="무료 / 유료 결과지와 유형별 문구를 편집합니다." showBack>
      <SurveyTabs id={id} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="무료 결과지 인트로">
          <textarea
            value={survey.freeResultIntro}
            onChange={(e) => patch({ freeResultIntro: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-sm"
          />
        </Card>
        <Card title="유료 상세 결과지 인트로">
          <textarea
            value={survey.paidResultIntro}
            onChange={(e) => patch({ paidResultIntro: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-sm"
          />
        </Card>
        <Card title="CTA 버튼">
          <label className="text-xs text-muted-foreground">버튼 문구</label>
          <input
            value={survey.ctaLabel}
            onChange={(e) => patch({ ctaLabel: e.target.value })}
            className="mb-3 mt-1 w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-sm"
          />
          <label className="text-xs text-muted-foreground">프로그램 / 상담 링크</label>
          <input
            value={survey.ctaUrl}
            onChange={(e) => patch({ ctaUrl: e.target.value })}
            placeholder="https://..."
            className="mt-1 w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-sm"
          />
        </Card>
      </div>

      <h2 className="mt-10 mb-4 font-serif text-xl text-foreground">유형별 결과 문구</h2>
      <div className="space-y-4">
        {survey.resultTypes.map((t, i) => (
          <div key={t.id} className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-[var(--clay)]/90 px-3 py-1 text-xs text-white">
                유형 {t.key}
              </span>
              <button
                onClick={() =>
                  patch({ resultTypes: survey.resultTypes.filter((_, j) => j !== i) })
                }
                className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={t.name}
                onChange={(e) => patchType(i, { name: e.target.value })}
                placeholder="유형명"
                className="rounded-xl border border-border/70 bg-white px-4 py-2.5 text-sm font-serif"
              />
              <input
                value={t.oneLiner}
                onChange={(e) => patchType(i, { oneLiner: e.target.value })}
                placeholder="한 줄 요약"
                className="rounded-xl border border-border/70 bg-white px-4 py-2.5 text-sm"
              />
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs text-muted-foreground">특징 3가지</label>
              {t.features.map((f, fi) => (
                <input
                  key={fi}
                  value={f}
                  onChange={(e) => {
                    const features = [...t.features];
                    features[fi] = e.target.value;
                    patchType(i, { features });
                  }}
                  className="w-full rounded-xl border border-border/70 bg-white px-4 py-2 text-sm"
                />
              ))}
            </div>
            <label className="mt-3 block text-xs text-muted-foreground">상세 결과지 본문</label>
            <textarea
              value={t.detailedBody}
              onChange={(e) => patchType(i, { detailedBody: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-sm"
            />
          </div>
        ))}
        <button
          onClick={() => {
            const next = String.fromCharCode(65 + survey.resultTypes.length);
            patch({
              resultTypes: [
                ...survey.resultTypes,
                {
                  id: "t_" + Math.random().toString(36).slice(2, 8),
                  key: next,
                  name: `유형 ${next}`,
                  oneLiner: "",
                  features: ["", "", ""],
                  detailedBody: "",
                },
              ],
            });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-white/40 py-4 text-sm text-foreground/70 hover:bg-white"
        >
          <Plus className="h-4 w-4" /> 유형 추가
        </button>
      </div>
    </AdminShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-card">
      <h3 className="mb-3 font-serif text-lg text-foreground">{title}</h3>
      {children}
    </div>
  );
}
