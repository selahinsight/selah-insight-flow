import { createFileRoute, Link } from "@tanstack/react-router";
import heroPortrait from "@/assets/hero-portrait.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SELAH — 나를 이해하는 진단 설문" },
      { name: "description", content: "Self-Diagnosis Survey Lab. 설문을 통해 현재 상태와 반복 패턴을 확인하고, 나에게 필요한 다음 단계를 발견하세요." },
      { property: "og:title", content: "SELAH — 나를 이해하는 진단 설문" },
      { property: "og:description", content: "Self-Diagnosis Survey Lab — 차분한 자기진단 웹앱." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Serif+KR:wght@300;400;500;700&display=swap" },
    ],
  }),
  component: Landing,
});

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="34" height="34" viewBox="0 0 40 40" className="text-[var(--clay)]">
        <path d="M20 4 C 30 8, 36 16, 32 26 C 28 34, 16 36, 10 30 C 4 24, 6 12, 14 8 C 18 6, 22 4, 20 4 Z"
          fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span className="font-serif text-2xl tracking-[0.25em] text-[var(--clay)]">SELAH</span>
    </div>
  );
}

function Landing() {
  const navItems = ["Home", "Survey", "Results", "Insights"];
  return (
    <div className="min-h-screen bg-[var(--ivory)]">
      {/* Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 md:px-12">
        <Logo />
        <nav className="hidden items-center gap-10 md:flex">
          {navItems.map((n) => (
            <a key={n} href="#" className="text-sm font-medium text-foreground/70 transition hover:text-[var(--clay)]">
              {n}
            </a>
          ))}
        </nav>
        <Link
          to="/"
          className="rounded-full bg-white px-6 py-3 text-sm font-medium text-foreground shadow-card transition hover:shadow-soft"
        >
          Start Diagnosis
        </Link>
      </header>

      {/* Hero */}
      <main className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 pb-24 pt-8 md:px-12 lg:grid-cols-2 lg:gap-8">
        {/* Left copy */}
        <section className="flex flex-col justify-center lg:py-16">
          <h1 className="font-serif text-5xl leading-[1.2] text-foreground md:text-6xl lg:text-7xl">
            나를 이해하는<br />진단 설문
          </h1>
          <p className="mt-8 font-serif text-2xl italic tracking-wide text-[var(--clay)]">
            Self-Diagnosis Survey Lab
          </p>
          <p className="mt-10 max-w-md text-base leading-relaxed text-foreground/70">
            설문을 통해 현재 상태와 반복 패턴을<br />
            확인하고, 나에게 필요한 다음 단계를 발견하세요.
          </p>
          <div className="mt-10">
            <button className="rounded-full bg-gradient-rose px-10 py-4 text-base font-medium text-white shadow-soft transition hover:translate-y-[-1px] hover:shadow-[0_24px_60px_-20px_oklch(0.5_0.08_25/0.4)]">
              무료 진단 시작
            </button>
          </div>
        </section>

        {/* Right visual */}
        <section className="relative min-h-[620px]">
          {/* Pink rounded panel */}
          <div className="absolute right-0 top-0 h-[92%] w-[58%] rounded-l-[180px] bg-gradient-rose" />
          {/* Vertical label */}
          <span className="vertical-text absolute right-8 top-1/2 -translate-y-1/2 font-serif text-2xl tracking-[0.4em] text-white/90">
            DIAGNOSIS LAB
          </span>

          {/* Oval card */}
          <div className="absolute left-2 top-6 h-[90%] w-[78%] overflow-hidden rounded-full border border-foreground/10 bg-[var(--ivory)] shadow-soft">
            <img
              src={heroPortrait}
              alt="A serene profile portrait representing self-reflection"
              className="h-[55%] w-full object-cover opacity-90"
            />

            {/* Floating UI cards */}
            <div className="absolute left-6 right-6 top-[42%] space-y-3">
              <div className="rounded-2xl bg-white/85 p-4 shadow-card backdrop-blur">
                <p className="text-[11px] font-medium text-foreground/80">지금의 나는,<br />어떤 상태일까요?</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-foreground/50">1</span>
                  <div className="relative h-1 flex-1 rounded-full bg-[var(--rose-soft)]/40">
                    <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--rose)] shadow" />
                  </div>
                  <span className="text-[10px] text-foreground/50">10</span>
                </div>
              </div>

              <div className="rounded-2xl bg-white/85 p-4 shadow-card backdrop-blur">
                <p className="mb-2 text-[11px] font-medium text-foreground/80">나의 경향을 선택해주세요</p>
                <ul className="space-y-1.5 text-[10px] text-foreground/70">
                  {[
                    { label: "쉽게 지치고 에너지가 부족해요", checked: true },
                    { label: "생각이 많고 불안감을 느껴요", checked: false },
                    { label: "관계에서 상처를 반복해요", checked: false },
                    { label: "나 자신을 잘 모르겠어요", checked: false },
                  ].map((o) => (
                    <li key={o.label} className="flex items-center gap-2">
                      <span className={`grid h-3 w-3 place-items-center rounded-[3px] border ${o.checked ? "border-[var(--clay)] bg-[var(--clay)] text-white" : "border-foreground/30"}`}>
                        {o.checked && <svg viewBox="0 0 10 10" className="h-2 w-2"><path d="M1 5 L4 8 L9 2" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>}
                      </span>
                      {o.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-white/85 p-4 shadow-card backdrop-blur">
                <p className="mb-2 text-[11px] font-medium text-foreground/80">발견된 핵심 키워드</p>
                <div className="flex flex-wrap gap-1.5">
                  {["자기이해", "회복", "균형", "성장"].map((k) => (
                    <span key={k} className="rounded-full bg-[var(--rose-soft)]/40 px-2.5 py-1 text-[10px] text-[var(--clay)]">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-10 text-center text-xs text-foreground/40 md:px-12">
        © SELAH Diagnosis Lab — 모든 문항은 안전하게 보호됩니다.
      </footer>
    </div>
  );
}
