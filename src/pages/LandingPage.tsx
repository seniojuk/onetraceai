import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  ArrowUpRight,
  Check,
  Command,
  GitBranch,
  Network,
  PlayCircle,
  Sparkles,
  Zap,
  AlertTriangle,
  Layers,
  Activity,
  CircleDot,
  Workflow,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { HeroFlow } from "@/components/landing/HeroFlow";
import { Reveal, ScrollProgress, useActiveSection } from "@/components/landing/motion";

/**
 * Marketing home. Architectural density direction.
 * Locked design system: Geist + Instrument Serif italic accents,
 * hairline borders, semantic tokens, status palette, btn-3d buttons.
 * No hardcoded colors. Full-bleed dark band for narrative rhythm.
 */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-geist antialiased selection:bg-accent/20">
      <Nav />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <HowItWorks />
      <CoverageShowcase />
      <IntegrationsRow />
      <PricingSection />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default LandingPage;

/* ---------- Nav ---------- */

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#problem", id: "problem", label: "Problem" },
    { href: "#solution", id: "solution", label: "Solution" },
    { href: "#how", id: "how", label: "How it works" },
    { href: "#pricing", id: "pricing", label: "Pricing" },
  ];
  const active = useActiveSection(links.map((l) => l.id));

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-border bg-background/85 shadow-[0_1px_0_0_hsl(var(--border)),0_10px_30px_-20px_hsl(var(--foreground)/0.15)]"
          : "border-transparent bg-background/60"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2 text-sm">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/60 text-[11px] font-semibold text-accent-foreground transition-transform duration-300 group-hover:rotate-[-4deg] group-hover:scale-105">
            OT
          </div>
          <span className="font-semibold tracking-tight text-foreground">OneTrace</span>
          <span className="text-muted-foreground">AI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-[13px] text-muted-foreground md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} data-active={active === l.id} className="nav-link hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link to="/auth" className="btn-3d btn-3d-ghost inline-flex h-8 items-center px-3 text-[13px]">
            Sign in
          </Link>
          <Link
            to="/auth?mode=signup"
            className="btn-3d btn-3d-primary inline-flex h-8 items-center gap-1.5 px-3 text-[13px] font-medium"
          >
            Start free <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted/50"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] max-w-sm border-l border-border bg-background p-0">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/60 text-[11px] font-semibold text-accent-foreground">
                    OT
                  </div>
                  <span className="font-semibold tracking-tight">OneTrace</span>
                  <span className="text-muted-foreground">AI</span>
                </div>
              </div>
              <nav className="flex flex-col px-3 py-4">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base text-foreground/90 transition-colors hover:bg-muted/50"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
              <div className="mt-2 flex flex-col gap-2 border-t border-border px-5 py-4">
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="btn-3d btn-3d-ghost inline-flex h-10 items-center justify-center px-3 text-sm"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth?mode=signup"
                  onClick={() => setOpen(false)}
                  className="btn-3d btn-3d-primary inline-flex h-10 items-center justify-center gap-1.5 px-3 text-sm font-medium"
                >
                  Start free <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <ScrollProgress />
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Very subtle top vignette. Linear keeps it nearly black. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background: "radial-gradient(60% 60% at 50% -10%, hsl(var(--foreground) / 0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-8 pt-32 pb-16 md:pt-40 md:pb-20">
        {/* Headline. Left aligned, oversized, tight. */}
        <Reveal
          as="h1"
          y={20}
          className="max-w-[18ch] font-geist text-[40px] font-medium leading-[1.06] tracking-[-0.04em] text-foreground sm:text-[52px] md:text-[64px] lg:text-[72px]"
        >
          Ship AI-built software with <span className="text-accent">confidence</span>
        </Reveal>

        {/* Subhead */}
        <Reveal as="p" delay={120} className="mt-8 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Plan, build, and prove every line of AI-generated software.
        </Reveal>

        {/* Product visual. Full-bleed panel below, Linear-style. */}
        <Reveal delay={220} y={28} className="relative mt-10 md:mt-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[32px] bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--accent)/0.10),transparent_70%)] blur-2xl"
          />
          <HeroFlow />
        </Reveal>
      </div>
    </section>
  );
}

function HeroGraph() {
  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_hsl(var(--foreground)/0.18)]">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            artifact-graph / main
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          <Command className="h-3 w-3" /> live
        </div>
      </div>

      <div className="relative p-5">
        {/* Animated edges */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 400 360"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.05" />
              <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M70 70 C 170 70, 170 180, 270 180"
            stroke="url(#edge)"
            strokeWidth="1"
            fill="none"
            strokeDasharray="3 4"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.6s" repeatCount="indefinite" />
          </path>
          <path
            d="M70 290 C 170 290, 170 180, 270 180"
            stroke="url(#edge)"
            strokeWidth="1"
            fill="none"
            strokeDasharray="3 4"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="2.1s" repeatCount="indefinite" />
          </path>
        </svg>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <GraphNode kind="prd" id="PRD-042" title="User Authentication" meta="3 stories · 4 ACs" progress={85} />
            <GraphNode kind="epic" id="EPIC-014" title="Onboarding v2" meta="8 stories" progress={48} />
          </div>
          <GraphNode
            kind="story"
            id="STORY-217"
            title="Google OAuth flow"
            meta="in progress · 4h ago · jori"
            progress={62}
            featured
          />
          <div className="grid grid-cols-2 gap-3">
            <GraphNode kind="test" id="TEST-091" title="OAuth callback spec" meta="3/3 passing" progress={100} />
            <GraphNode kind="commit" id="PR #482" title="feat(auth): handler" meta="linked · merged" progress={100} />
          </div>
        </div>

        {/* Live stats footer */}
        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border text-center">
          <Stat label="Coverage" value="94.2%" trend="+2.1%" />
          <Stat label="Drift" value="3" trend="open" tone="warn" />
          <Stat label="Velocity" value="12/wk" trend="+18%" />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  trend,
  tone = "ok",
}: {
  label: string;
  value: string;
  trend: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="bg-card px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-geist text-[18px] font-medium tracking-tight text-foreground">{value}</div>
      <div className={`font-mono text-[10px] ${tone === "warn" ? "text-drift" : "text-accent"}`}>{trend}</div>
    </div>
  );
}

function GraphNode({
  kind,
  id,
  title,
  meta,
  progress,
  featured = false,
}: {
  kind: StatusKey;
  id: string;
  title: string;
  meta: string;
  progress: number;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border bg-background p-4 transition ${
        featured
          ? "border-accent/40 shadow-[0_0_0_4px_hsl(var(--accent)/0.08)]"
          : "border-border hover:border-foreground/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <StatusBadge status={kind} label={id} mono />
        <span className="font-mono text-[11px] text-muted-foreground">{progress}%</span>
      </div>
      <h4 className="mt-3 truncate text-[13px] font-medium tracking-tight text-foreground">{title}</h4>
      <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">{meta}</p>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- Problem ---------- */

function ProblemSection() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <Section id="problem" eyebrow="01 / The problem" title="Your build flow is fast. Your traceability is broken.">
        <p className="-mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          You ideate in ChatGPT. You generate a PRD. You paste prompts into Lovable, Cursor, or Replit. Code appears.
          Then what?
        </p>
        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p, idx) => (
            <Reveal key={p.title} delay={idx * 70}>
              <div className="group h-full bg-card p-6 lift hover:bg-muted/30">
                <p.icon className="h-4 w-4 text-destructive icon-pop" />
                <h3 className="mt-4 text-[14px] font-medium tracking-tight text-foreground">{p.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-[13px] text-muted-foreground">
          So <span className="font-serif italic text-foreground/80">"done"</span> becomes a vibe. Bugs ship. Rework
          grows.
        </p>
      </Section>
    </div>
  );
}

/* ---------- Solution: full-bleed dark band ---------- */

function SolutionSection() {
  return (
    <section
      id="solution"
      className="dark relative overflow-hidden border-y border-border bg-background text-foreground"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]"
      />
      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              02 / The solution
            </div>
            <h2 className="mt-3 font-geist text-[36px] leading-[1.05] tracking-[-0.03em] text-foreground md:text-[44px]">
              An AI-native <span className="font-serif italic text-foreground/70">system of record.</span>
            </h2>
            <p className="mt-6 max-w-md text-[14px] leading-relaxed text-muted-foreground">
              OneTrace builds a <span className="font-serif italic text-foreground/80">living map</span> of your product.
              It connects every artifact, tracks every relationship, and versions every change.
            </p>
            <Link
              to="/auth?mode=signup"
              className="btn-3d btn-3d-accent mt-8 inline-flex h-10 items-center gap-1.5 px-4 text-[13px] font-medium"
            >
              See the graph <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
              {PILLARS.map((p, idx) => (
                <Reveal key={p.title} delay={idx * 80}>
                  <div className="group h-full bg-card p-6 lift">
                    <div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-muted/40 text-accent">
                      <p.icon className="h-4 w-4 icon-pop" />
                    </div>
                    <h3 className="mt-5 text-[15px] font-medium tracking-tight text-foreground">{p.title}</h3>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{p.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */

function HowItWorks() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <Section id="how" eyebrow="03 / How it works" title="Three steps to traceable software.">
        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Connecting line */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
          />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <div className="group relative h-full rounded-xl border border-border bg-card p-6 lift">
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Step {String(i + 1).padStart(2, "0")}
                  </span>
                  <s.icon className="h-4 w-4 text-accent icon-pop" />
                </div>
                <h3 className="mt-5 text-[16px] font-medium tracking-tight text-foreground">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ---------- Coverage Showcase ---------- */

function CoverageShowcase() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <Section eyebrow="04 / Coverage engine" title="Know exactly what's done. And what's not.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Oversized data viz */}
          <div className="rounded-xl border border-border bg-card p-6 lg:col-span-3">
            <div className="flex items-end justify-between">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Coverage overview
                </span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-geist text-[56px] font-medium leading-none tracking-[-0.04em] text-foreground">
                    94.2%
                  </span>
                  <span className="font-mono text-[12px] text-accent">+2.1%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent">
                  <ShieldCheck className="h-3.5 w-3.5" /> Healthy
                </div>
              </div>
            </div>
            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-accent to-accent/60" />
            </div>
            <div className="mt-6 space-y-3 border-t border-border pt-5">
              {[
                { label: "User Authentication", v: "10/12", pct: 83, kind: "ac" as StatusKey },
                { label: "Payment Integration", v: "5/8", pct: 62, kind: "story" as StatusKey },
                { label: "Dashboard Views", v: "6/6", pct: 100, kind: "epic" as StatusKey },
                { label: "API Layer", v: "7/15", pct: 47, kind: "test" as StatusKey },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <StatusBadge status={r.kind} label={r.kind.toUpperCase()} mono />
                  <span className="flex-1 truncate text-[13px] text-foreground">{r.label}</span>
                  <div className="hidden h-1 w-28 overflow-hidden rounded-full bg-muted sm:block">
                    <div className="h-full rounded-full bg-accent/70" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{r.v}</span>
                  <span className="w-10 text-right font-mono text-[11px] text-accent">{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drift findings */}
          <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Drift findings
              </span>
              <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[11px] text-destructive">
                3 open
              </span>
            </div>
            <h3 className="mt-4 text-[18px] font-medium tracking-tight text-foreground">
              Catch problems <span className="font-serif italic text-foreground/70">before</span> they ship.
            </h3>
            <div className="mt-5 space-y-px overflow-hidden rounded-lg border border-border">
              {[
                { icon: AlertTriangle, title: "Untraced commit", meta: "abc123 has no linked requirement" },
                { icon: AlertTriangle, title: "Missing tests", meta: "STORY-004 has 0/3 ACs tested" },
                { icon: AlertTriangle, title: "Status mismatch", meta: "STORY-002 done but Jira shows In Review" },
              ].map((d) => (
                <div
                  key={d.title}
                  className="flex items-start gap-3 bg-background px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <d.icon className="mt-0.5 h-4 w-4 shrink-0 text-drift" />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-foreground">{d.title}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{d.meta}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/auth?mode=signup"
              className="btn-3d btn-3d-secondary mt-5 inline-flex h-8 items-center gap-1.5 px-3 text-[12px]"
            >
              View all findings <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ---------- Integrations ---------- */

function IntegrationsRow() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <Section id="integrations" eyebrow="05 / Integrations" title="Fits your existing workflow.">
        <p className="-mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          OneTrace doesn't replace your tools. It connects them.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
          {INTEGRATIONS.map((i, idx) => (
            <Reveal key={i.name} delay={idx * 60}>
              <div className="group h-full bg-card p-6 lift hover:bg-muted/30">
                <div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-muted/40 text-foreground/80 transition-colors group-hover:border-accent/40 group-hover:text-accent">
                  <svg
                    viewBox={i.viewBox}
                    className="h-5 w-5 fill-current icon-pop"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-label={`${i.name} logo`}
                    role="img"
                  >
                    <path d={i.path} />
                  </svg>
                </div>
                <h4 className="mt-4 text-[14px] font-medium tracking-tight text-foreground">{i.name}</h4>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{i.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ---------- Pricing ---------- */

function PricingSection() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <Section id="pricing" eyebrow="06 / Pricing" title="Start free. Upgrade when you're ready.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((p, idx) => (
            <Reveal key={p.name} delay={idx * 100}>
              <div
                className={`relative h-full rounded-xl border bg-card p-6 lift ${
                  p.featured
                    ? "border-accent/40 ring-1 ring-accent/20 shadow-[0_20px_60px_-30px_hsl(var(--accent)/0.4)]"
                    : "border-border"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-2.5 left-6 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                    Most popular
                  </span>
                )}
                <div className="text-[13px] text-muted-foreground">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-geist text-[40px] font-medium tracking-[-0.03em] text-foreground">
                    {p.price}
                  </span>
                  <span className="text-[13px] text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-[12.5px] text-muted-foreground">{p.tagline}</p>
                <ul className="mt-5 space-y-2 border-t border-border pt-4">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-foreground/90">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth?mode=signup"
                  className={`mt-6 inline-flex h-9 w-full items-center justify-center gap-1.5 px-3 text-[13px] font-medium btn-3d ${
                    p.featured ? "btn-3d-accent" : "btn-3d-secondary"
                  }`}
                >
                  {p.cta} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ---------- Final CTA ---------- */

function FinalCTA() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="relative my-24 overflow-hidden rounded-2xl border border-border bg-card p-12 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[100px]"
        />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent" />
            Ready when you are
          </div>
          <h2 className="font-geist text-[44px] leading-[1.05] tracking-[-0.03em] text-foreground md:text-[52px]">
            Ready to ship with <span className="font-serif italic text-foreground/70">confidence?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[14px] leading-relaxed text-muted-foreground">
            Join AI-first teams building traceable software. Start free, connect in minutes.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/auth?mode=signup"
              className="btn-3d btn-3d-primary inline-flex h-10 items-center gap-1.5 px-5 text-[14px] font-medium"
            >
              Get started free <ArrowUpRight className="h-4 w-4" />
            </Link>
            <a href="#pricing" className="btn-3d btn-3d-ghost inline-flex h-10 items-center px-4 text-[13px]">
              See pricing
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/60 text-[10px] font-semibold text-accent-foreground">
                OT
              </div>
              <span className="font-medium tracking-tight text-foreground">OneTrace</span>
            </div>
            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
              The traceability layer for AI-built software. PRDs → Stories → Jira → Git → Tests, connected in one living
              graph.
            </p>
          </div>
          {FOOTER_COLS.map((c) => (
            <div key={c.title}>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.title}</div>
              <ul className="mt-4 space-y-2.5 text-[13px]">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-foreground/80 transition-colors hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-[12px] text-muted-foreground md:flex-row md:items-center">
          <span>OneTrace AI · © 2026 · All rights reserved.</span>
          <div className="flex items-center gap-5 font-mono">
            <a href="#" className="hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground">
              Terms
            </a>
            <a href="#" className="hover:text-foreground">
              Security
            </a>
            <a href="#" className="hover:text-foreground">
              Status
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------- shared Section ---------- */

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-24">
      <Reveal className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div>
          <h2 className="mt-2 text-[28px] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[34px]">
            {title}
          </h2>
        </div>
      </Reveal>
      <Reveal delay={120}>{children}</Reveal>
    </section>
  );
}

/* ---------- Status badge ---------- */

type StatusKey = "prd" | "epic" | "story" | "ac" | "test" | "commit";

const STATUS_CLASSES: Record<StatusKey, string> = {
  prd: "border-status-prd/30 bg-status-prd/10 text-status-prd-fg [&_.dot]:bg-status-prd",
  epic: "border-status-epic/30 bg-status-epic/10 text-status-epic-fg [&_.dot]:bg-status-epic",
  story: "border-status-story/30 bg-status-story/10 text-status-story-fg [&_.dot]:bg-status-story",
  ac: "border-status-ac/30 bg-status-ac/10 text-status-ac-fg [&_.dot]:bg-status-ac",
  test: "border-status-test/30 bg-status-test/10 text-status-test-fg [&_.dot]:bg-status-test",
  commit: "border-status-commit/30 bg-status-commit/10 text-status-commit-fg [&_.dot]:bg-status-commit",
};

function StatusBadge({ status, label, mono = false }: { status: StatusKey; label: string; mono?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] tracking-tight ${
        mono ? "font-mono" : ""
      } ${STATUS_CLASSES[status]}`}
    >
      <span className="dot h-1.5 w-1.5 rounded-full" />
      {label}
    </span>
  );
}

/* ---------- content ---------- */

const PROBLEMS = [
  { icon: Network, title: "No clear mapping", body: "From requirements to modules to commits — nothing connects." },
  { icon: Activity, title: "No objective coverage", body: "Against acceptance criteria. You ship and hope." },
  { icon: GitBranch, title: "No safe regeneration", body: "When requirements change, everything breaks silently." },
  { icon: Sparkles, title: "No shared workspace", body: "Humans and AI agents work from different sources of truth." },
];

const PILLARS = [
  {
    icon: Layers,
    title: "Artifacts",
    body: "PRDs, Epics, Stories, ACs, Tests, Commits, PRs — all in one place with full version history.",
  },
  {
    icon: Workflow,
    title: "Edges",
    body: "Implements · Validates · Satisfies · Depends on. Every relationship is explicit and traceable.",
  },
  {
    icon: CircleDot,
    title: "Versions",
    body: "Every change is tracked, explainable, and reversible. See who changed what, and why.",
  },
];

const STEPS = [
  {
    icon: GitBranch,
    title: "Connect your tools",
    body: "Link Jira and Git in minutes. OneTrace syncs work items, code changes, and context automatically.",
  },
  {
    icon: Sparkles,
    title: "Generate traceable work",
    body: "Turn PRDs into Epics, Stories, and ACs — pushed into Jira with full trace metadata intact.",
  },
  {
    icon: Activity,
    title: "Prove coverage & catch drift",
    body: "Auto-link commits and PRs. See AC coverage in real time. Get alerts when code or requirements drift.",
  },
];

const INTEGRATIONS = [
  {
    name: "Jira Cloud",
    body: "Two-way sync with full-fidelity field mapping.",
    viewBox: "0 0 24 24",
    path: "M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z",
  },
  {
    name: "GitHub",
    body: "Commits, PRs, and webhook-driven coverage.",
    viewBox: "0 0 24 24",
    path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  {
    name: "OpenAI",
    body: "GPT-4 and o-series for intelligent agents.",
    viewBox: "0 0 256 260",
    path: "M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z",
  },
  {
    name: "Anthropic",
    body: "Claude for deep reasoning over your graph.",
    viewBox: "0 0 24 24",
    path: "M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    tagline: "For solo builders getting started.",
    features: ["1 project", "2 users", "100 artifacts", "Basic integrations", "Community support"],
    cta: "Get started",
    featured: false,
  },
  {
    name: "Builder",
    price: "$29",
    tagline: "For growing teams.",
    features: ["5 projects", "10 users", "Unlimited artifacts", "Full integrations", "AI agents", "Priority support"],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Scale",
    price: "$99",
    tagline: "For larger teams.",
    features: [
      "Unlimited projects",
      "Unlimited users",
      "Custom model hub",
      "Advanced analytics",
      "SSO / SAML",
      "Dedicated support",
    ],
    cta: "Contact sales",
    featured: false,
  },
];

const FOOTER_COLS = [
  { title: "Product", links: ["Artifact Graph", "Coverage", "Drift", "Integrations", "Pricing"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { title: "Resources", links: ["Docs", "Changelog", "Support"] },
];

/* Keep tree-shaker friendly */
const _keep = Zap;
void _keep;
