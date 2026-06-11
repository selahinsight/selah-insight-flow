import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-[var(--ivory)] text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-start px-6 py-6 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 40 40" className="text-[var(--clay)]">
            <path d="M20 4 C 30 8, 36 16, 32 26 C 28 34, 16 36, 10 30 C 4 24, 6 12, 14 8 C 18 6, 22 4, 20 4 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="font-serif text-base tracking-[0.28em] text-[var(--clay)]">SELAH</span>
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
          설문을 발행하고, 응답을 관리하세요
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
