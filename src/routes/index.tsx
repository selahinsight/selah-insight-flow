import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import selahLogo from "@/assets/selah-insight-logo.png.asset.json";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-[var(--ivory)] text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-start px-6 py-6 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <img src={selahLogo.url} alt="Selah Insight" className="h-8 w-auto" />
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center md:px-10 md:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-[var(--cream)] px-4 py-1.5 text-[11px] tracking-[0.2em] text-[var(--clay)]">
          SELAH INSIGHT
        </span>
        <h1 className="mx-auto mt-8 max-w-3xl font-serif text-4xl leading-tight text-foreground md:text-6xl">
          Selah Studio
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-foreground/75 md:text-lg">
          셀라의 설문과 고객을 관리합니다
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground/60">
        </p>

        <div className="mt-10 flex justify-center">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--clay)] px-8 py-3.5 text-sm font-medium text-white shadow-soft transition hover:translate-y-[-1px]"
          >
            시작하기 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-[var(--cream)] py-8 text-center text-xs text-muted-foreground">
        © SELAH
      </footer>
    </div>
  );
}
