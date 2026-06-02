import { Link } from "react-router-dom";
import { Fragment, useState } from "react";
import { ArrowUpRight, Check, Minus, Lock, Menu } from "lucide-react";
import { Reveal } from "@/components/landing/motion";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PublicFooter } from "@/components/marketing/PublicFooter";
import { AccentWord } from "@/components/marketing/AccentWord";

/* ===================== Data ===================== */

type Tier = {
  name: string;
  eyebrow: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  perUser?: { rate: string; seats: number };
  features: string[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    eyebrow: "Individual",
    price: "$0",
    priceSuffix: "/mo",
    tagline: "Kick the tires. See your first traced requirement.",
    features: ["1 project", "25 artifacts", "10 AI runs / month", "Jira + GitHub connect", "Community support"],
    cta: "Start free",
    ctaHref: "/auth?mode=signup",
  },
  {
    name: "Team",
    eyebrow: "Standard",
    price: "$149",
    priceSuffix: "/mo",
    tagline: "Flat-rate for engineering teams up to 10.",
    perUser: { rate: "$14.90", seats: 10 },
    features: [
      "Up to 10 users",
      "Unlimited projects",
      "Unlimited artifacts",
      "500 AI runs / month",
      "Full Jira + GitHub two-way sync",
      "Coverage engine + drift alerts",
    ],
    cta: "Start free trial",
    ctaHref: "/auth?mode=signup",
    featured: true,
  },
  {
    name: "Growth",
    eyebrow: "Scaling",
    price: "$399",
    priceSuffix: "/mo",
    tagline: "Power features for orgs scaling their trace graph.",
    perUser: { rate: "$15.96", seats: 25 },
    features: [
      "Up to 25 users",
      "Unlimited AI runs",
      "Slack notifications",
      "Audit log + versioning",
      "Priority support",
    ],
    cta: "Start free trial",
    ctaHref: "/auth?mode=signup",
  },
  {
    name: "Enterprise",
    eyebrow: "Custom",
    price: "Custom",
    tagline: "Security, scale, and white-glove onboarding.",
    features: ["Unlimited users", "SSO / SAML + SCIM", "Custom model hub", "Dedicated CSM", "SLA + DPA"],
    cta: "Contact sales",
    ctaHref: "/contact",
  },
];

const TRUST = [
  { icon: Check, label: "Cancel anytime" },
  { icon: Lock, label: "No card for free tier" },
];

type MatrixRow = { feature: string; values: (string | boolean)[] };
type MatrixGroup = { group: string; rows: MatrixRow[] };

const MATRIX: MatrixGroup[] = [
  {
    group: "Limits",
    rows: [
      { feature: "Users", values: ["1", "10", "25", "Unlimited"] },
      { feature: "Projects", values: ["1", "Unlimited", "Unlimited", "Unlimited"] },
      { feature: "Artifacts", values: ["25", "Unlimited", "Unlimited", "Unlimited"] },
      { feature: "AI runs / month", values: ["10", "500", "Unlimited", "Unlimited"] },
    ],
  },
  {
    group: "Integrations",
    rows: [
      { feature: "Jira two-way sync", values: [false, true, true, true] },
      { feature: "GitHub two-way sync", values: [false, true, true, true] },
      { feature: "Slack notifications", values: [false, false, true, true] },
    ],
  },
  {
    group: "AI & traceability",
    rows: [
      { feature: "Coverage engine", values: [false, true, true, true] },
      { feature: "Drift alerts", values: [false, true, true, true] },
      { feature: "Custom prompts / agents", values: [false, true, true, true] },
    ],
  },
  {
    group: "Collaboration",
    rows: [
      { feature: "Role-based access", values: [false, true, true, true] },
      { feature: "Audit log", values: [false, false, true, true] },
      { feature: "Artifact versioning", values: [false, false, true, true] },
    ],
  },
  {
    group: "Security & support",
    rows: [
      { feature: "SSO / SAML", values: [false, false, false, true] },
      { feature: "Support", values: ["Community", "Email", "Priority", "Dedicated"] },
    ],
  },
];

const FAQ = [
  {
    q: "What counts as an AI run?",
    a: "One automated generation or trace-mapping call: generating a PRD, an epic, a story, acceptance criteria, test cases, or linking a commit to a requirement. Browsing existing data never costs a run.",
  },
  {
    q: "What counts as an artifact?",
    a: "Any first-class object in your traceability graph: PRD, epic, story, AC set, test case, commit-link, or PR-link. Comments, versions, and audit entries don't count.",
  },
  {
    q: "What happens if we hit a limit?",
    a: "We notify you before you hit it — we never delete data or stop syncing. You can upgrade at any time.",
  },
  {
    q: "Can we cancel anytime?",
    a: "Yes. Cancel from the billing settings at any point. You keep access through the end of your current billing period.",
  },
];

/* ===================== Atoms ===================== */

function MatrixCell({ v }: { v: string | boolean }) {
  if (v === true)
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/15">
        <Check className="h-3 w-3 text-accent" strokeWidth={2.5} />
      </span>
    );
  if (v === false) return <Minus className="h-3.5 w-3.5 text-muted-foreground/40" />;
  return <span className="text-[12.5px] text-foreground/85">{v}</span>;
}

function FaqAccordion({ items }: { items: typeof FAQ }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((item, i) => (
        <li key={item.q}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:bg-muted/30"
          >
            <span className="text-[14px] font-medium text-foreground">{item.q}</span>
            <span
              className={`font-mono text-[18px] leading-none text-muted-foreground transition-transform ${
                open === i ? "rotate-45" : ""
              }`}
            >
              +
            </span>
          </button>
          {open === i && (
            <p className="pb-6 pr-10 text-[13.5px] leading-relaxed text-muted-foreground">{item.a}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function TierCard({ p }: { p: Tier }) {
  const isFeatured = !!p.featured;
  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border bg-card p-7 transition-colors ${
        isFeatured
          ? "border-accent/60 ring-1 ring-accent/30 shadow-[0_30px_80px_-40px_hsl(var(--accent)/0.5)] md:-translate-y-2"
          : "border-border hover:border-foreground/15"
      }`}
    >
      {isFeatured && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-foreground shadow-sm">
          Most popular
        </span>
      )}
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
          isFeatured ? "text-accent" : "text-muted-foreground"
        }`}
      >
        {p.eyebrow}
      </div>
      <h3 className="mt-5 font-geist text-[20px] font-medium tracking-[-0.01em] text-foreground">{p.name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-geist text-[40px] font-medium tracking-[-0.03em] text-foreground">{p.price}</span>
        {p.priceSuffix && <span className="text-[13px] text-muted-foreground">{p.priceSuffix}</span>}
      </div>

      {/* Per-user proof badge — flat team math, in-context */}
      {p.perUser ? (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 ${
            isFeatured ? "border-accent/30 bg-accent/8" : "border-border bg-muted/40"
          }`}
        >
          <div className={`text-[12.5px] font-semibold ${isFeatured ? "text-accent" : "text-foreground/80"}`}>
            ~{p.perUser.rate} per user
          </div>
          <div className="text-[10.5px] text-muted-foreground">Flat rate at {p.perUser.seats} seats</div>
        </div>
      ) : (
        <div className="mt-3 h-[44px]" aria-hidden />
      )}

      <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">{p.tagline}</p>

      <Link
        to={p.ctaHref}
        className={`mt-6 inline-flex h-9 w-full items-center justify-center gap-1.5 px-3 text-[13px] font-medium btn-3d ${
          isFeatured ? "btn-3d-primary" : "btn-3d-secondary"
        }`}
      >
        {p.cta} <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>

      <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] text-foreground/90">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonMatrix({ highlightCol = 1 }: { highlightCol?: number }) {
  return (
    <>
      {/* Desktop / tablet: full matrix */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="w-[34%] py-4 pr-4 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Feature
              </th>
              {TIERS.map((t, i) => (
                <th
                  key={t.name}
                  className={`py-4 text-center text-[13px] font-medium ${
                    i === highlightCol ? "text-accent" : "text-foreground"
                  }`}
                >
                  {t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((g) => (
              <Fragment key={g.group}>
                <tr className="border-b border-border bg-muted/30">
                  <td
                    colSpan={5}
                    className="py-2.5 pr-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {g.group}
                  </td>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.feature} className="border-b border-border/70">
                    <td className="py-3 pr-4 text-[13px] text-foreground/90">{r.feature}</td>
                    {r.values.map((v, i) => (
                      <td key={i} className={`py-3 text-center ${i === highlightCol ? "bg-accent/5" : ""}`}>
                        <MatrixCell v={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: per-plan tabs, one column shown at a time */}
      <MobileComparison highlightCol={highlightCol} />
    </>
  );
}

function MobileComparison({ highlightCol = 1 }: { highlightCol?: number }) {
  const [active, setActive] = useState(highlightCol);
  return (
    <div className="md:hidden">
      {/* Plan switcher */}
      <div
        role="tablist"
        aria-label="Select plan"
        className="sticky top-2 z-10 -mx-1 mb-5 flex gap-1 overflow-x-auto rounded-full border border-border bg-card/90 p-1 backdrop-blur"
      >
        {TIERS.map((t, i) => {
          const isActive = i === active;
          return (
            <button
              key={t.name}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.name}
            </button>
          );
        })}
      </div>

      {/* Selected plan column */}
      <div className="rounded-2xl border border-border bg-card">
        {MATRIX.map((g, gi) => (
          <div key={g.group} className={gi === 0 ? "" : "border-t border-border"}>
            <div className="px-4 pt-4 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {g.group}
            </div>
            <ul>
              {g.rows.map((r) => (
                <li
                  key={r.feature}
                  className="flex items-center justify-between gap-4 border-t border-border/70 px-4 py-3"
                >
                  <span className="text-[13px] text-foreground/90">{r.feature}</span>
                  <span className="shrink-0">
                    <MatrixCell v={r.values[active]} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalCTA() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="relative my-24 overflow-hidden rounded-[32px] border border-border bg-card p-12 text-center shadow-[0_1px_3px_hsl(var(--foreground)/0.02),0_20px_40px_-12px_hsl(var(--foreground)/0.04)] md:p-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--accent)/0.04)_0%,transparent_70%)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-1/2 -left-1/4 h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--accent)/0.02)_0%,transparent_70%)] blur-2xl"
        />
        <div className="relative flex flex-col items-center">
          <h2 className="max-w-3xl font-geist text-[44px] leading-[1.05] tracking-[-0.03em] text-foreground md:text-[60px]">
            Start free. <AccentWord>Upgrade anytime.</AccentWord>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Free forever for solo builders. No credit card required.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/auth?mode=signup"
              className="btn-3d btn-3d-primary inline-flex h-11 items-center gap-1.5 px-6 text-[14px] font-medium"
            >
              Start free <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex h-11 items-center px-4 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* Nav imported from shared PublicNav */


/* ===================== Page ===================== */

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-geist antialiased selection:bg-accent/20">
      <PublicNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <h1 className="mx-auto mt-4 max-w-3xl font-geist text-[52px] leading-[1.05] tracking-[-0.03em] text-foreground md:text-[64px]">
          Start free. <AccentWord>Upgrade anytime.</AccentWord>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground">
          Flat-rate pricing for engineering teams. No per-seat creep, no hidden fees, no surprises on
          renewal.
        </p>
        <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {TRUST.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-accent" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tier cards — Team is anchored, flat-rate math lives inside Team & Growth */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((p, idx) => (
            <Reveal key={p.name} delay={idx * 80}>
              <TierCard p={p} />
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
          Billed monthly, cancel anytime.
        </p>
      </section>

      {/* What counts */}
      <section className="mx-auto mt-24 max-w-5xl px-6">
        <div className="rounded-2xl border border-border bg-muted/30 p-8 md:p-10">
          <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
            <div>
              <h2 className="font-geist text-[26px] leading-tight tracking-[-0.02em] md:text-[30px]">
                What counts as a <AccentWord>unit?</AccentWord>
              </h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                We charge for value created, not characters typed.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  Artifact
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
                  Any node in your trace graph: PRD, epic, story, AC, test, or commit-link.
                </p>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  AI run
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
                  One generation or auto-trace call. Browsing your graph never costs a run.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="mx-auto mt-24 max-w-5xl px-6">
        <div className="mb-8 text-center">
          <h2 className="font-geist text-[36px] leading-tight tracking-[-0.025em] md:text-[42px]">
            Every feature, side by side.
          </h2>
        </div>
        <ComparisonMatrix highlightCol={1} />
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-24 max-w-3xl px-6">
        <div className="mb-8 text-center">
          <h2 className="font-geist text-[36px] leading-tight tracking-[-0.025em]">
            Common questions.
          </h2>
        </div>
        <FaqAccordion items={FAQ} />
      </section>

      <FinalCTA />
      <PublicFooter />
    </div>
  );
}
