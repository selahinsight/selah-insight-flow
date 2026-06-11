import { createFileRoute, Link } from "@tanstack/react-router";
import { listSurveys } from "@/lib/survey-store";
import { useSurveys } from "@/lib/use-surveys";
import { ArrowRight, Sparkles, FileText, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  useSurveys();
  const sample = typeof window !== "undefined" ? listSurveys()[0] : undefined;

  return (
    <div className="min-h-screen bg-[var(--ivory)] text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 40 40" className="text-[var(--clay)]">
            <path d="M20 4 C 30 8, 36 16, 32 26 C 28 34, 16 36, 10 30 C 4 24, 6 12, 14 8 C 18 6, 22 4, 20 4 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="font-serif text-base tracking-[0.28em] text-[var(--clay)]">SELAH</span>
        </Link>
        <Link
          to="/admin"
          className="text-sm text-foreground/70 hover:text-[var(--clay)]"
        >
          관리자 대시보드 →
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16 text-center md:px-10 md:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-[var(--cream)] px-4 py-1.5 text-[11px] tracking-[0.2em] text-[var(--clay)]">
          DIAGNOSIS LAB · SELF-DIAGNOSIS SURVEY BUILDER
        </span>
        <h1 className="mx-auto mt-8 max-w-3xl font-serif text-4xl leading-tight text-foreground md:text-6xl">
          자기진단 설문을 만들고,<br />결과를 분석하고,<br />프로그램 연결까지 설계하세요.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-foreground/70 md:text-lg">
          Selah 콘텐츠를 보고 들어온 사람들이 자신의 상태와 반복 패턴을<br className="hidden md:inline" />
          이해하도록 돕는 진단 설문 제작 웹앱입니다.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--clay)] px-7 py-3.5 text-sm font-medium text-white shadow-soft transition hover:translate-y-[-1px]"
          >
            관리자 시작하기 <ArrowRight className="h-4 w-4" />
          </Link>
          {sample ? (
            <Link
              to="/s/$slug"
              params={{ slug: sample.slug }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-7 py-3.5 text-sm font-medium text-foreground/80 hover:bg-[var(--sand)]/40"
            >
              샘플 설문 보기
            </Link>
          ) : (
            <Link
              to="/admin/new"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-7 py-3.5 text-sm font-medium text-foreground/80 hover:bg-[var(--sand)]/40"
            >
              새 설문 만들기
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-24 md:grid-cols-3 md:px-10">
        <Feature
          icon={<Sparkles className="h-5 w-5" />}
          title="AI 자기진단 설문 생성"
          body="주제·목적·핵심 정보를 입력하면 AI가 진단 질문과 결과 유형 초안을 만들어 줍니다."
        />
        <Feature
          icon={<FileText className="h-5 w-5" />}
          title="무료 / 유료 결과지 설계"
          body="유형별 무료 결과지와 상세 분석이 담긴 유료 결과지를 분리해 구성합니다."
        />
        <Feature
          icon={<BarChart3 className="h-5 w-5" />}
          title="응답 결과 분석"
          body="유형 분포, 고객 언어, 구매 장벽, 전환 가능성을 한 화면에서 확인합니다."
        />
      </section>

      <footer className="border-t border-border/60 bg-[var(--cream)] py-8 text-center text-xs text-muted-foreground">
        © SELAH Diagnosis Lab
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-6 shadow-card">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sand)] text-[var(--clay)]">{icon}</div>
      <h3 className="mt-4 font-serif text-lg text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-foreground/70">{body}</p>
    </div>
  );
}
