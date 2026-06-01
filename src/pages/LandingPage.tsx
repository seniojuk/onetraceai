import { Link } from "react-router-dom";
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
} from "lucide-react";

/**
 * Marketing home — same design language as `/design`.
 * Semantic tokens only, hairline borders, mono eyebrows, Geist display,
 * Instrument Serif accents, btn-3d buttons, status tokens. No hardcoded colors.
 */
const LandingPage = () => {
  return (
    <div className="dark min-h-screen bg-background text-foreground font-geist antialiased">
      <Nav />

      <main className="mx-auto max-w-6xl px-6">
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <HowItWorks />
        <CoverageShowcase />
        <IntegrationsRow />
        <PricingSection />
        <FinalCTA />
      </main>

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
  return (
    <section className="pt-24 pb-24">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Built for AI-first startups & solo builders
      </div>
      <h1 className="font-geist text-[64px] leading-[1.02] tracking-[-0.04em] text-foreground">
        Ship AI-built software with
        <br />
        <span className="font-serif italic text-foreground/70">confidence</span> — not crossed fingers.
      </h1>
      <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        OneTrace connects your PRDs, Stories, Jira, Git, and Tests into one traceable
        Artifact Graph — so every feature has an owner, every commit has intent, and
        every release has proof.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
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
        <div className="ml-2 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3 w-3 text-accent" /> Start free
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3 w-3 text-accent" /> Connect in minutes
          </span>
        </div>
      </div>

      {/* Hero product visual */}
      <div className="mt-16 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
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
            <Command className="h-3 w-3" /> v1.0
          </div>
        </div>
        <div className="grid gap-6 p-10 md:grid-cols-3">
          <GraphNode kind="prd" id="PRD-042" title="User Authentication" meta="85% coverage" progress={85} />
          <GraphNode kind="story" id="STORY-217" title="Google OAuth flow" meta="In progress · 4h ago" progress={62} />
          <GraphNode kind="commit" id="PR #482" title="feat(auth): callback handler" meta="Linked · jori" progress={100} />
        </div>
      </div>
    </section>
  );
}

function GraphNode({
  kind,
  id,
  title,
  meta,
  progress,
}: {
  kind: StatusKey;
  id: string;
  title: string;
  meta: string;
  progress: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <StatusBadge status={kind} label={id} mono />
        <span className="font-mono text-[11px] text-muted-foreground">{progress}%</span>
      </div>
      <h4 className="mt-4 text-[14px] font-medium tracking-tight text-foreground">{title}</h4>
      <p className="mt-1 text-[12px] text-muted-foreground">{meta}</p>
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- Problem ---------- */

function ProblemSection() {
  return (
    <Section id="problem" eyebrow="01 — The problem" title="Your build flow is fast. Your traceability is broken.">
      <p className="-mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        You ideate in ChatGPT. You generate a PRD. You paste prompts into Lovable, Cursor,
        or Replit. Code appears — but now what?
      </p>
      <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        {PROBLEMS.map((p) => (
          <div key={p.title} className="bg-card p-6">
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
  );
}

/* ---------- Solution ---------- */

function SolutionSection() {
  return (
    <Section id="solution" eyebrow="02 — The solution" title="An AI-native system of record.">
      <p className="-mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        OneTrace builds a <span className="font-serif italic text-foreground/80">living map</span> of your product — connecting every artifact, tracking every relationship, versioning every change.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="bg-card p-6">
            <p.icon className="h-4 w-4 text-accent" />
            <h3 className="mt-4 text-[15px] font-medium tracking-tight text-foreground">{p.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- How it works ---------- */

function HowItWorks() {
  return (
    <Section id="how" eyebrow="03 — How it works" title="Three steps to traceable software.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Step {String(i + 1).padStart(2, "0")}
              </span>
              <s.icon className="h-4 w-4 text-accent" />
            </div>
            <h3 className="mt-4 text-[16px] font-medium tracking-tight text-foreground">{s.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Coverage Showcase ---------- */

function CoverageShowcase() {
  return (
    <Section eyebrow="04 — Coverage engine" title="Know exactly what's done — and what's not.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Coverage overview
          </span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-geist text-[40px] font-medium tracking-[-0.03em] text-foreground">94.2%</span>
            <span className="font-mono text-[12px] text-accent">+2.1%</span>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-accent to-accent/70" />
          </div>
          <div className="mt-6 space-y-3 border-t border-border pt-4">
            {[
              { label: "User Authentication", v: "10/12", pct: 83, kind: "ac" as StatusKey },
              { label: "Payment Integration", v: "5/8", pct: 62, kind: "story" as StatusKey },
              { label: "Dashboard Views", v: "6/6", pct: 100, kind: "epic" as StatusKey },
              { label: "API Layer", v: "7/15", pct: 47, kind: "test" as StatusKey },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <StatusBadge status={r.kind} label={r.kind.toUpperCase()} mono />
                <span className="flex-1 truncate text-[13px] text-foreground">{r.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{r.v}</span>
                <span className="w-10 text-right font-mono text-[11px] text-accent">{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Drift findings
            </span>
            <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[11px] text-destructive">
              3 open
            </span>
          </div>
          <h3 className="mt-4 text-[18px] font-medium tracking-tight text-foreground">
            Catch problems before they ship.
          </h3>
          <div className="mt-5 space-y-px overflow-hidden rounded-lg border border-border">
            {[
              { icon: AlertTriangle, title: "Untraced commit", meta: "abc123 has no linked requirement" },
              { icon: AlertTriangle, title: "Missing tests", meta: "STORY-004 has 0/3 ACs tested" },
              { icon: AlertTriangle, title: "Status mismatch", meta: "STORY-002 done but Jira shows In Review" },
            ].map((d) => (
              <div key={d.title} className="flex items-start gap-3 bg-background px-4 py-3">
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
  );
}

/* ---------- Integrations ---------- */

function IntegrationsRow() {
  return (
    <Section id="integrations" eyebrow="05 — Integrations" title="Connects to your existing workflow.">
      <p className="-mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        OneTrace doesn't replace your tools — it connects them.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="bg-card p-6">
            <div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-muted/40 font-mono text-[11px] text-foreground/80">
              {i.short}
            </div>
            <h4 className="mt-4 text-[14px] font-medium tracking-tight text-foreground">{i.name}</h4>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{i.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Pricing ---------- */

function PricingSection() {
  return (
    <Section id="pricing" eyebrow="06 — Pricing" title="Start free. Scale when you're ready.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-xl border bg-card p-6 ${
              p.featured ? "border-accent/40 ring-1 ring-accent/20" : "border-border"
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
  );
}

/* ---------- Final CTA ---------- */

function FinalCTA() {
  return (
    <section className="my-24 overflow-hidden rounded-2xl border border-border bg-card p-12 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-accent" />
        Ready when you are
      </div>
      <h2 className="font-geist text-[48px] leading-[1.05] tracking-[-0.03em] text-foreground">
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
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="mx-auto max-w-6xl border-t border-border px-6 py-10">
      <div className="flex flex-col items-start justify-between gap-4 text-[12px] text-muted-foreground md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <div className="grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/60 text-[9px] font-semibold text-accent-foreground">
            OT
          </div>
          <span>OneTrace AI · © 2026</span>
        </div>
        <div className="flex items-center gap-6 font-mono">
          <a href="#" className="hover:text-foreground">Docs</a>
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Contact</a>
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
    <section id={id} className="mb-24">
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

/* ---------- Status badge (mirrors /design) ---------- */

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
    icon: Network,
    title: "Edges",
    body: "Implements · Validates · Satisfies · Depends on. Every relationship is explicit and traceable.",
  },
  {
    icon: Activity,
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

/* Need to keep Zap import alive for tree-shaker friendliness */
const _keepZap = Zap;
void _keepZap;
