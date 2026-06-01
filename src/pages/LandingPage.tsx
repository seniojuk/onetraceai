import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
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
  Terminal,
  Image as ImageIcon,
  Waves,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeProvider";

type HeroVariant = "graph" | "product" | "aurora" | "console";
const HERO_KEY = "onetrace-hero-variant";

/**
 * Marketing home — Architectural density direction.
 * Locked design system: Geist + Instrument Serif italic accents,
 * hairline borders, semantic tokens, status palette, btn-3d buttons.
 * No hardcoded colors. Full-bleed dark band for narrative rhythm.
 */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-geist antialiased selection:bg-accent/20">
      <Nav />
      <Hero />
      <TrustBand />
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
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/60 text-[10px] font-semibold text-accent-foreground">
            OT
          </div>
          <span className="font-medium tracking-tight text-foreground">OneTrace</span>
          <span className="text-muted-foreground/70">/</span>
          <span className="text-muted-foreground">AI</span>
        </div>
        <nav className="hidden items-center gap-8 text-[13px] text-muted-foreground md:flex">
          <a href="#problem" className="transition-colors hover:text-foreground">Problem</a>
          <a href="#solution" className="transition-colors hover:text-foreground">Solution</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
          <Link to="/design" className="transition-colors hover:text-foreground">Design</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/auth" className="btn-3d btn-3d-ghost inline-flex h-8 items-center px-3 text-[13px]">
            Sign in
          </Link>
          <Link
            to="/auth?mode=signup"
            className="btn-3d btn-3d-primary inline-flex h-8 items-center gap-1.5 px-3 text-[13px] font-medium"
          >
            Get Started <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  const [variant, setVariant] = useState<HeroVariant>("graph");

  useEffect(() => {
    const saved = localStorage.getItem(HERO_KEY) as HeroVariant | null;
    if (saved) setVariant(saved);
  }, []);

  const choose = (v: HeroVariant) => {
    setVariant(v);
    localStorage.setItem(HERO_KEY, v);
  };

  const isAurora = variant === "aurora";

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Background: aurora variant gets a full-bleed shader, others get the dot grid */}
      {isAurora ? <AuroraBackdrop /> : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.45] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
      )}

      {/* Variant switcher */}
      <div className="relative mx-auto max-w-6xl px-6 pt-6">
        <HeroVariantSwitcher value={variant} onChange={choose} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-10 pb-24">
        {isAurora ? (
          /* Aurora: centered editorial hero */
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Built for AI-first startups & solo builders
            </div>
            <h1 className="mt-6 font-geist text-[64px] leading-[1.02] tracking-[-0.04em] text-foreground md:text-[84px]">
              Ship with{" "}
              <span className="font-serif italic text-foreground/70">confidence</span>.
              Not crossed fingers.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              The traceability layer for AI-built software. PRDs, stories, tests, and
              commits — woven into one living <span className="font-serif italic text-foreground/80">Artifact Graph</span>.
            </p>
            <HeroCTAs />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                Built for AI-first startups & solo builders
              </div>
              <h1 className="mt-6 font-geist text-[56px] leading-[1.02] tracking-[-0.04em] text-foreground md:text-[68px]">
                Ship AI-built software with{" "}
                <span className="font-serif italic text-foreground/70">confidence</span>
                {" "}— not crossed fingers.
              </h1>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                OneTrace connects your PRDs, Stories, Jira, Git, and Tests into one
                traceable <span className="font-serif italic text-foreground/80">Artifact Graph</span> — so
                every feature has an owner, every commit has intent, and every release
                has proof.
              </p>
              <HeroCTAs />
            </div>

            <div className="lg:col-span-6">
              {variant === "graph" && <HeroGraph />}
              {variant === "product" && <HeroProduct />}
              {variant === "console" && <HeroConsole />}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HeroCTAs() {
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3 justify-start data-[center=true]:justify-center">
        <Link
          to="/auth?mode=signup"
          className="btn-3d btn-3d-primary group inline-flex h-10 items-center gap-1.5 px-4 text-[14px] font-medium"
        >
          Get started free
          <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
        <button className="btn-3d btn-3d-secondary inline-flex h-10 items-center gap-2 px-4 text-[13px]">
          <PlayCircle className="h-4 w-4" />
          Watch demo
        </button>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Start free</span>
        <span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Connect in minutes</span>
        <span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> No credit card</span>
      </div>
    </>
  );
}

function HeroVariantSwitcher({
  value,
  onChange,
}: {
  value: HeroVariant;
  onChange: (v: HeroVariant) => void;
}) {
  const items: { key: HeroVariant; label: string; icon: typeof Network }[] = [
    { key: "graph", label: "Lineage", icon: Network },
    { key: "product", label: "Product", icon: ImageIcon },
    { key: "console", label: "Console", icon: Terminal },
    { key: "aurora", label: "Aurora", icon: Waves },
  ];
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Hero direction · preview
      </span>
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 p-1 backdrop-blur">
        {items.map((it) => {
          const active = it.key === value;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition ${
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <it.icon className="h-3 w-3" />
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Hero visual variants ---------- */

function AuroraBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[680px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--accent)/0.35),transparent_70%)] blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute top-20 left-[10%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,hsl(var(--status-prd)/0.35),transparent_70%)] blur-3xl animate-[pulse_11s_ease-in-out_infinite]" />
      <div className="absolute top-40 right-[5%] h-[480px] w-[480px] rounded-full bg-[radial-gradient(closest-side,hsl(var(--status-story)/0.30),transparent_70%)] blur-3xl animate-[pulse_9s_ease-in-out_infinite]" />
      <div className="absolute bottom-0 left-[30%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,hsl(var(--status-epic)/0.30),transparent_70%)] blur-3xl animate-[pulse_13s_ease-in-out_infinite]" />
      <div
        className="absolute inset-0 opacity-[0.25] [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_80%)]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}

function HeroProduct() {
  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_hsl(var(--foreground)/0.25)]">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            onetrace.ai / coverage
          </span>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">⌘K</div>
      </div>

      <div className="grid grid-cols-12 gap-0">
        {/* Sidebar */}
        <aside className="col-span-3 border-r border-border bg-muted/20 p-3">
          {["Dashboard","Artifacts","Coverage","Lineage","Drift","Integrations"].map((l, i) => (
            <div key={l} className={`mb-0.5 rounded-md px-2 py-1.5 text-[11px] ${i===2 ? "bg-foreground/10 text-foreground" : "text-muted-foreground"}`}>
              {l}
            </div>
          ))}
        </aside>

        {/* Main */}
        <div className="col-span-9 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Coverage</div>
              <div className="mt-1 font-geist text-[32px] tracking-tight">94.2<span className="text-muted-foreground">%</span></div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Drift</div>
              <div className="mt-1 font-geist text-[32px] tracking-tight text-drift">3</div>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {[
              { k: "prd" as StatusKey, label: "PRD-042 · Auth", pct: 96 },
              { k: "epic" as StatusKey, label: "EPIC-014 · Onboarding", pct: 78 },
              { k: "story" as StatusKey, label: "STORY-217 · OAuth", pct: 62 },
              { k: "test" as StatusKey, label: "TEST-091 · Callback", pct: 100 },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <StatusBadge status={r.k} label={r.k.toUpperCase()} mono />
                <span className="flex-1 truncate text-[12px] text-foreground">{r.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground w-9 text-right">{r.pct}%</span>
                <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-border bg-background p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Recent drift</div>
            <div className="space-y-1.5">
              {["PR #482 merged without linked test","STORY-203 has no AC","EPIC-009 missing PRD"].map((d) => (
                <div key={d} className="flex items-center gap-2 text-[11.5px] text-foreground/80">
                  <AlertTriangle className="h-3 w-3 text-drift" /> {d}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroConsole() {
  const lines = [
    { t: "10:42:01", k: "prd", msg: "PRD-042 'User Authentication' created" },
    { t: "10:42:08", k: "epic", msg: "EPIC-014 generated from PRD-042" },
    { t: "10:43:11", k: "story", msg: "STORY-217 'Google OAuth flow' assigned → jori" },
    { t: "10:44:22", k: "test", msg: "TEST-091 callback spec ✓ 3/3 passing" },
    { t: "10:45:03", k: "commit", msg: "PR #482 linked → STORY-217 · merged" },
    { t: "10:45:04", k: "ok", msg: "coverage 92.1% → 94.2%  (+2.1%)" },
    { t: "10:45:09", k: "warn", msg: "drift: PR #486 missing test reference" },
  ];
  const toneFor = (k: string) => {
    if (k === "ok") return "text-accent";
    if (k === "warn") return "text-drift";
    return `text-status-${k}-fg`;
  };
  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_hsl(var(--foreground)/0.2)]">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            onetrace · live event stream
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> streaming
        </span>
      </div>
      <div className="p-5 font-mono text-[11.5px] leading-relaxed">
        {lines.map((l, i) => (
          <div
            key={i}
            className="flex gap-3 opacity-0 animate-[fade-in_0.4s_ease-out_forwards]"
            style={{ animationDelay: `${i * 220}ms` }}
          >
            <span className="text-muted-foreground/60">{l.t}</span>
            <span className={`w-14 shrink-0 uppercase ${toneFor(l.k)}`}>{l.k}</span>
            <span className="text-foreground/85">{l.msg}</span>
          </div>
        ))}
        <div className="mt-3 flex items-center gap-2 text-muted-foreground">
          <span className="text-accent">›</span>
          <span className="h-3 w-2 animate-pulse bg-foreground/70" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-b-2xl border-t border-border bg-border text-center">
        <Stat label="Coverage" value="94.2%" trend="+2.1%" />
        <Stat label="Drift" value="3" trend="open" tone="warn" />
        <Stat label="Velocity" value="12/wk" trend="+18%" />
      </div>
    </div>
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
          <path d="M70 70 C 170 70, 170 180, 270 180" stroke="url(#edge)" strokeWidth="1" fill="none" strokeDasharray="3 4">
            <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.6s" repeatCount="indefinite" />
          </path>
          <path d="M70 290 C 170 290, 170 180, 270 180" stroke="url(#edge)" strokeWidth="1" fill="none" strokeDasharray="3 4">
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
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-geist text-[18px] font-medium tracking-tight text-foreground">
        {value}
      </div>
      <div
        className={`font-mono text-[10px] ${
          tone === "warn" ? "text-drift" : "text-accent"
        }`}
      >
        {trend}
      </div>
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
      <h4 className="mt-3 truncate text-[13px] font-medium tracking-tight text-foreground">
        {title}
      </h4>
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

/* ---------- Trust band ---------- */

function TrustBand() {
  return (
    <section className="border-b border-border bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Trusted by AI-first builders shipping with traceability
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[13px] font-medium text-muted-foreground/80">
          {["LOVABLE", "CURSOR", "REPLIT", "VERCEL", "LINEAR", "ATTIO"].map((b) => (
            <span key={b} className="tracking-[0.25em] transition-colors hover:text-foreground">
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Problem ---------- */

function ProblemSection() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <Section id="problem" eyebrow="01 — The problem" title="Your build flow is fast. Your traceability is broken.">
        <p className="-mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          You ideate in ChatGPT. You generate a PRD. You paste prompts into Lovable, Cursor,
          or Replit. Code appears — but now what?
        </p>
        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="group bg-card p-6 transition-colors hover:bg-muted/30">
              <p.icon className="h-4 w-4 text-destructive" />
              <h3 className="mt-4 text-[14px] font-medium tracking-tight text-foreground">{p.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-[13px] text-muted-foreground">
          So <span className="font-serif italic text-foreground/80">"done"</span> becomes a vibe. Bugs ship. Rework grows.
        </p>
      </Section>
    </div>
  );
}

/* ---------- Solution — full-bleed dark band ---------- */

function SolutionSection() {
  return (
    <section id="solution" className="dark relative overflow-hidden border-y border-border bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
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
              02 — The solution
            </div>
            <h2 className="mt-3 font-geist text-[36px] leading-[1.05] tracking-[-0.03em] text-foreground md:text-[44px]">
              An AI-native <span className="font-serif italic text-foreground/70">system of record.</span>
            </h2>
            <p className="mt-6 max-w-md text-[14px] leading-relaxed text-muted-foreground">
              OneTrace builds a <span className="font-serif italic text-foreground/80">living map</span> of your product —
              connecting every artifact, tracking every relationship, versioning every change.
            </p>
            <Link
              to="/auth?mode=signup"
              className="btn-3d btn-3d-accent mt-8 inline-flex h-10 items-center gap-1.5 px-4 text-[13px] font-medium"
            >
              Explore the graph <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
              {PILLARS.map((p) => (
                <div key={p.title} className="bg-card p-6">
                  <div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-muted/40 text-accent">
                    <p.icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-5 text-[15px] font-medium tracking-tight text-foreground">{p.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
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
      <Section id="how" eyebrow="03 — How it works" title="Three steps to traceable software.">
        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Connecting line */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
          />
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Step {String(i + 1).padStart(2, "0")}
                </span>
                <s.icon className="h-4 w-4 text-accent" />
              </div>
              <h3 className="mt-5 text-[16px] font-medium tracking-tight text-foreground">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
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
      <Section eyebrow="04 — Coverage engine" title="Know exactly what's done — and what's not.">
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
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </div>
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
                    <div
                      className="h-full rounded-full bg-accent/70"
                      style={{ width: `${r.pct}%` }}
                    />
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
                <div key={d.title} className="flex items-start gap-3 bg-background px-4 py-3 transition-colors hover:bg-muted/40">
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
      <Section id="integrations" eyebrow="05 — Integrations" title="Connects to your existing workflow.">
        <p className="-mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          OneTrace doesn't replace your tools — it connects them.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="group bg-card p-6 transition-colors hover:bg-muted/30">
              <div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-muted/40 font-mono text-[11px] text-foreground/80 transition-colors group-hover:border-accent/40 group-hover:text-accent">
                {i.short}
              </div>
              <h4 className="mt-4 text-[14px] font-medium tracking-tight text-foreground">{i.name}</h4>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{i.body}</p>
            </div>
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
      <Section id="pricing" eyebrow="06 — Pricing" title="Start free. Scale when you're ready.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-xl border bg-card p-6 ${
                p.featured ? "border-accent/40 ring-1 ring-accent/20 shadow-[0_20px_60px_-30px_hsl(var(--accent)/0.4)]" : "border-border"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-2.5 left-6 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                  Most popular
                </span>
              )}
              <div className="text-[13px] text-muted-foreground">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-geist text-[40px] font-medium tracking-[-0.03em] text-foreground">{p.price}</span>
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
            backgroundImage:
              "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 70%)",
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
            <Link
              to="/design"
              className="btn-3d btn-3d-ghost inline-flex h-10 items-center px-4 text-[13px]"
            >
              See the design system
            </Link>
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
              <span className="text-muted-foreground/70">/</span>
              <span className="text-muted-foreground">AI</span>
            </div>
            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
              The traceability layer for AI-built software. PRDs → Stories → Jira → Git → Tests,
              connected in one living graph.
            </p>
          </div>
          {FOOTER_COLS.map((c) => (
            <div key={c.title}>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {c.title}
              </div>
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
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Security</a>
            <a href="#" className="hover:text-foreground">Status</a>
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
    <section id={id} className="py-24">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-[28px] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[34px]">
            {title}
          </h2>
        </div>
      </div>
      {children}
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
  { icon: Layers, title: "Artifacts", body: "PRDs, Epics, Stories, ACs, Tests, Commits, PRs — all in one place with full version history." },
  { icon: Workflow, title: "Edges", body: "Implements · Validates · Satisfies · Depends on. Every relationship is explicit and traceable." },
  { icon: CircleDot, title: "Versions", body: "Every change is tracked, explainable, and reversible. See who changed what, and why." },
];

const STEPS = [
  { icon: GitBranch, title: "Connect your tools", body: "Link Jira and Git in minutes. OneTrace syncs work items, code changes, and context automatically." },
  { icon: Sparkles, title: "Generate traceable work", body: "Turn PRDs into Epics, Stories, and ACs — pushed into Jira with full trace metadata intact." },
  { icon: Activity, title: "Prove coverage & catch drift", body: "Auto-link commits and PRs. See AC coverage in real time. Get alerts when code or requirements drift." },
];

const INTEGRATIONS = [
  { name: "Jira Cloud", short: "JC", body: "Two-way sync with full-fidelity field mapping." },
  { name: "GitHub", short: "GH", body: "Commits, PRs, and webhook-driven coverage." },
  { name: "OpenAI", short: "AI", body: "GPT-4 and o-series for intelligent agents." },
  { name: "Anthropic", short: "AN", body: "Claude for deep reasoning over your graph." },
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
    features: ["Unlimited projects", "Unlimited users", "Custom model hub", "Advanced analytics", "SSO / SAML", "Dedicated support"],
    cta: "Contact sales",
    featured: false,
  },
];

const FOOTER_COLS = [
  { title: "Product", links: ["Artifact Graph", "Coverage", "Drift", "Integrations", "Pricing"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { title: "Resources", links: ["Docs", "Changelog", "Design system", "Support"] },
];

/* Keep tree-shaker friendly */
const _keep = Zap;
void _keep;
