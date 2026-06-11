import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { AdminShell, SurveyTabs } from "@/components/admin/admin-shell";
import { useSurvey } from "@/lib/use-surveys";
import { upsertSurvey } from "@/lib/survey-store";
import { Copy, Download, Eye, Globe2, Link2, Lock, QrCode } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/surveys/$id/publish")({
  component: Publish,
});

function Publish() {
  const { id } = Route.useParams();
  const survey = useSurvey(id);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQr, setShowQr] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const url =
    typeof window !== "undefined" && survey
      ? `${window.location.origin}/s/${survey.slug}`
      : survey ? `/s/${survey.slug}` : "";

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: "#3D342B", light: "#FFFBF3" } })
      .then(setQrDataUrl)
      .catch((e) => console.error(e));
  }, [url]);

  if (!survey) return <AdminShell title="설문 없음">{null}</AdminShell>;

  const isPublished = survey.status === "published";

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `selah-qr-${survey!.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("QR 코드를 저장했어요");
  }

  function copy(text: string, msg = "복사되었습니다") {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  }

  return (
    <AdminShell title={survey.title} subtitle="설문 URL을 발행하고 응답을 수집합니다." showBack>
      <SurveyTabs id={id} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-2xl border border-border/60 bg-white/70 p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl text-foreground">상태</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  설문중으로 전환하면 URL로 누구나 응답할 수 있습니다.
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
                {isPublished ? "설문중" : "설문 시작하기"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-white/70 p-6 shadow-card">
            <h3 className="font-serif text-xl text-foreground">진단 링크 (응답자용)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              이 링크를 공유하면 누구나 편집 권한 없이 응답만 할 수 있어요.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-[var(--ivory)] px-4 py-3 font-mono text-xs text-foreground/80">
              <span className="flex-1 truncate">{url}</span>
              <button
                onClick={() => copy(url, "진단 링크가 복사되었습니다")}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs shadow"
              >
                <Link2 className="h-3 w-3" /> 진단 링크 복사
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

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => copy(url)}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-white px-3 py-1.5 text-xs"
              >
                <Copy className="h-3 w-3" /> URL 복사
              </button>
              <button
                onClick={() => setShowQr((s) => !s)}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-white px-3 py-1.5 text-xs"
              >
                <QrCode className="h-3 w-3" /> {showQr ? "QR 숨기기" : "QR 코드 보기"}
              </button>
              {qrDataUrl && (
                <button
                  onClick={downloadQr}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--clay)] px-3 py-1.5 text-xs text-white"
                >
                  <Download className="h-3 w-3" /> QR 저장
                </button>
              )}
            </div>

            {showQr && qrDataUrl && (
              <div className="mt-4 flex flex-col items-center rounded-2xl border border-border/60 bg-[var(--ivory)] p-5">
                <img
                  src={qrDataUrl}
                  alt="진단 QR 코드"
                  className="h-56 w-56 rounded-lg bg-white p-2 shadow"
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  QR 스캔 시 응답자용 진단 페이지로 이동합니다.
                </p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        <aside className="lg:col-span-2">
          <div className="rounded-3xl bg-gradient-clay p-6 text-white shadow-soft">
            <p className="font-serif text-lg">응답자 화면 미리보기</p>
            <p className="mt-1 text-sm text-white/85">
              응답자가 보게 될 시작 화면과 질문 흐름, 결과 페이지를 확인하세요.
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

          {survey.resultTypes && survey.resultTypes.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border/60 bg-white/70 p-5">
              <p className="text-sm font-medium text-foreground">결과 유형 {survey.resultTypes.length}개</p>
              <ul className="mt-2 space-y-1 text-xs text-foreground/75">
                {survey.resultTypes.map((r) => (
                  <li key={r.id}>· {r.title}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
