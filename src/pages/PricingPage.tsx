import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowUpRight, Check, Minus, ShieldCheck, Zap, Sparkles, Lock, Globe2 } from "lucide-react";
import { Reveal } from "@/components/landing/motion";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

/* ===================== Shared data ===================== */

type Tier = {
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  features: string[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
  dark?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    price: "$0",
    priceSuffix: "/month",
    tagline: "Kick the tires. See your first traced requirement.",
    features: ["1 project", "25 artifacts", "10 AI runs / month", "Jira + GitHub connect", "Community support"],
    cta: "Start free",
    ctaHref: "/auth?mode=signup",
  },
  {
    name: "Team",
    price: "$149",
    priceSuffix: "/month",
    tagline: "For seed → Series A engineering teams.",
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
    price: "$399",
    priceSuffix: "/month",
    tagline: "Scaling engineering orgs.",
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
  { icon: ShieldCheck, label: "SOC 2 Type II (in progress)" },
  { icon: Globe2, label: "EU data residency option" },
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
      { feature: "Data retention", values: ["30 days", "1 year", "3 years", "Unlimited"] },
    ],
  },
  {
    group: "Integrations",
    rows: [
      { feature: "Jira two-way sync", values: [false, true, true, true] },
      { feature: "GitHub two-way sync", values: [false, true, true, true] },
      { feature: "Slack notifications", values: [false, false, true, true] },
      { feature: "Webhooks + REST API", values: ["Read-only", "Read/write", "Read/write", "Unlimited"] },
      { feature: "Custom connectors", values: [false, false, false, true] },
    ],
  },
  {
    group: "AI & traceability",
    rows: [
      { feature: "Coverage engine", values: [false, true, true, true] },
      { feature: "Drift alerts", values: [false, true, true, true] },
      { feature: "Custom model hub", values: [false, false, false, true] },
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
      { feature: "SSO / SAML", values: [false, false, "Add-on", true] },
      { feature: "SCIM provisioning", values: [false, false, false, true] },
      { feature: "EU data residency", values: [false, false, false, true] },
      { feature: "Support", values: ["Community", "Email", "Priority", "Dedicated CSM"] },
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
    a: "We notify you at 80% and 100% — we never delete data or stop syncing. You can upgrade, or buy a top-up of 100 AI runs.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes — annual billing is ~17% off (two months free) on all paid tiers. Contact us to switch after signup.",
  },
  {
    q: "Can we self-host?",
    a: "Single-tenant VPC deployments are available on Enterprise (AWS, GCP, Azure). EU data residency is included.",
  },
  {
    q: "Is there a discount for early-stage startups?",
    a: "Yes — pre-seed and seed teams under 10 people get 50% off Team for the first 12 months. Email us with your AngelList or Crunchbase link.",
  },
];

const SEAT_MATH = [
  { plan: "Team", seats: 10, monthly: 149 },
  { plan: "Growth", seats: 25, monthly: 399 },
];

/* ===================== Shared atoms ===================== */

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

function TrustStrip() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {TRUST.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-accent" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
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
          <h2 className="font-geist text-[40px] leading-[1.05] tracking-[-0.03em] text-foreground md:text-[48px]">
            Start free.{" "}
            <span className="font-serif italic text-foreground/70">Upgrade when you're ready.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[14px] leading-relaxed text-muted-foreground">
            Free forever for solo builders. No credit card required.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/auth?mode=signup"
              className="btn-3d btn-3d-primary inline-flex h-10 items-center gap-1.5 px-5 text-[14px] font-medium"
            >
              Start free <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="btn-3d btn-3d-ghost inline-flex h-10 items-center px-4 text-[13px]"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ===================== Tier cards (shared) ===================== */

function TierCard({ p, dense = false }: { p: Tier; dense?: boolean }) {
  return (
    <div
      className={`relative h-full rounded-xl border bg-card ${dense ? "p-5" : "p-6"} lift ${
        p.featured
          ? "border-accent/60 ring-1 ring-accent/30 shadow-[0_20px_60px_-30px_hsl(var(--accent)/0.5)]"
          : "border-border"
      }`}
    >
      {p.featured && (
        <span className="absolute -top-2.5 left-6 rounded-full bg-accent px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-foreground shadow-sm">
          Most popular
        </span>
      )}
      <div className="text-[13px] text-muted-foreground">{p.name}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-geist text-[40px] font-medium tracking-[-0.03em] text-foreground">
          {p.price}
        </span>
        {p.priceSuffix && <span className="text-[13px] text-muted-foreground">{p.priceSuffix}</span>}
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
        to={p.ctaHref}
        className={`mt-6 inline-flex h-9 w-full items-center justify-center gap-1.5 px-3 text-[13px] font-medium btn-3d ${
          p.featured ? "btn-3d-accent" : "btn-3d-secondary"
        }`}
      >
        {p.cta} <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ===================== Comparison matrix (shared) ===================== */

function ComparisonMatrix({ highlightCol = 1 }: { highlightCol?: number }) {
  return (
    <div className="overflow-x-auto">
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
            <>
              <tr key={`g-${g.group}`} className="border-b border-border bg-muted/30">
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
                    <td
                      key={i}
                      className={`py-3 text-center ${
                        i === highlightCol ? "bg-accent/5" : ""
                      }`}
                    >
                      <MatrixCell v={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===================== V1: Editorial calm ===================== */

function VariantOne() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          06 / Pricing
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl font-geist text-[52px] leading-[1.05] tracking-[-0.03em] text-foreground md:text-[64px]">
          Start free.{" "}
          <span className="font-serif italic text-foreground/70">Upgrade when you're ready.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground">
          Transparent pricing for engineering teams. No hidden fees, no seat-sniping, no surprises
          on renewal.
        </p>
        <div className="mx-auto mt-10 max-w-3xl border-y border-border py-5">
          <TrustStrip />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((p, idx) => (
            <Reveal key={p.name} delay={idx * 80}>
              <TierCard p={p} />
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
          ~$15/user on Team — less than a Figma seat. Billed monthly, cancel anytime.
        </p>
      </section>

      <section className="mx-auto mt-24 max-w-4xl px-6">
        <div className="rounded-2xl border border-border bg-muted/30 p-10">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                How we count
              </span>
              <h2 className="mt-3 font-geist text-[28px] leading-tight tracking-[-0.02em]">
                What counts as a{" "}
                <span className="font-serif italic text-foreground/70">unit?</span>
              </h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                We charge for value created, not characters typed. Two units, defined plainly.
              </p>
            </div>
            <div className="space-y-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  Artifact
                </div>
                <p className="mt-1 text-[13.5px] text-foreground/90">
                  Any node in your trace graph: PRD, epic, story, AC, test, or commit-link.
                </p>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  AI run
                </div>
                <p className="mt-1 text-[13.5px] text-foreground/90">
                  One generation or auto-trace call. Browsing your graph never costs a run.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-5xl px-6">
        <div className="mb-8 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Compare
          </span>
          <h2 className="mt-3 font-geist text-[36px] leading-tight tracking-[-0.025em] md:text-[42px]">
            Every feature, side by side.
          </h2>
        </div>
        <ComparisonMatrix highlightCol={1} />
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-6">
        <div className="mb-8 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">FAQ</span>
          <h2 className="mt-3 font-geist text-[36px] leading-tight tracking-[-0.025em]">
            Common questions.
          </h2>
        </div>
        <FaqAccordion items={FAQ} />
      </section>

      <FinalCTA />
    </>
  );
}

/* ===================== V2: Technical / log-viewer ===================== */

function VariantTwo() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12">
        <div className="grid items-end gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              06 / Pricing
            </span>
            <h1 className="mt-4 font-geist text-[52px] leading-[1.02] tracking-[-0.03em] md:text-[64px]">
              Priced like an{" "}
              <span className="font-serif italic text-foreground/70">SDK,</span> not a sales pitch.
            </h1>
          </div>
          <div className="space-y-4 border-l border-border pl-6">
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Transparent unit economics. Every limit listed. Every overage at a fixed price. No
              "contact us" for anything under Enterprise.
            </p>
            <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground/80">
              <div className="text-muted-foreground"># overage pricing</div>
              <div>
                ai_runs_topup <span className="text-accent">= $19 / 100 runs</span>
              </div>
              <div>
                extra_seat <span className="text-accent">= $19 / seat / month</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((p, idx) => (
            <Reveal key={p.name} delay={idx * 80}>
              <TierCard p={p} dense />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <TrustStrip />
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              Usage units
            </span>
            <h2 className="mt-3 font-geist text-[34px] leading-tight tracking-[-0.025em]">
              What you're actually{" "}
              <span className="font-serif italic text-foreground/70">paying for.</span>
            </h2>
            <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
              Two units, two rules. Both metered transparently in your workspace usage panel.
            </p>
            <ul className="mt-6 space-y-3 text-[13px] text-foreground/90">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> Reads, browsing, and
                viewing the graph are free.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> Webhook-driven syncs
                don't burn AI runs.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> Soft limits — we
                notify, never cut off.
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 font-mono text-[11.5px] leading-[1.7] text-foreground/85">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">usage_log.txt</span>
              <span className="flex items-center gap-1 text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> live
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">[10:42:01]</span> view artifact PRD-128{" "}
              <span className="text-muted-foreground">→ 0 runs</span>
            </div>
            <div>
              <span className="text-muted-foreground">[10:42:14]</span> generate epic from PRD-128{" "}
              <span className="text-accent">→ 1 run</span>
            </div>
            <div>
              <span className="text-muted-foreground">[10:42:31]</span> sync STORY-217 → Jira{" "}
              <span className="text-muted-foreground">→ 0 runs</span>
            </div>
            <div>
              <span className="text-muted-foreground">[10:43:02]</span> auto-trace commit a7b3f{" "}
              <span className="text-accent">→ 1 run</span>
            </div>
            <div>
              <span className="text-muted-foreground">[10:43:55]</span> generate AC for STORY-217{" "}
              <span className="text-accent">→ 1 run</span>
            </div>
            <div className="mt-3 border-t border-border pt-2 text-foreground">
              month-to-date:{" "}
              <span className="text-accent">137 / 500 runs</span> · 27% used
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <div className="mb-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Compare
          </span>
          <h2 className="mt-3 font-geist text-[36px] leading-tight tracking-[-0.025em]">
            Full feature matrix.
          </h2>
        </div>
        <ComparisonMatrix highlightCol={1} />
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-6">
        <h2 className="mb-8 font-geist text-[36px] leading-tight tracking-[-0.025em]">
          Common questions.
        </h2>
        <FaqAccordion items={FAQ} />
      </section>

      <FinalCTA />
    </>
  );
}

/* ===================== V3: Per-seat math forward ===================== */

function VariantThree() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          06 / Pricing
        </span>
        <div className="mt-4 grid items-end gap-8 md:grid-cols-2">
          <h1 className="font-geist text-[52px] leading-[1.02] tracking-[-0.03em] md:text-[64px]">
            Less than a{" "}
            <span className="font-serif italic text-foreground/70">Figma seat.</span>
          </h1>
          <p className="text-[14.5px] leading-relaxed text-muted-foreground md:pb-3">
            Flat team pricing. No per-seat creep. Bring your whole engineering team without watching
            the bill climb.
          </p>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {SEAT_MATH.map((m) => (
            <div
              key={m.plan}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-5"
            >
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {m.plan} plan
                </div>
                <div className="mt-1 font-geist text-[22px] tracking-[-0.02em]">
                  ${m.monthly}/mo ÷ {m.seats} users
                </div>
              </div>
              <div className="text-right">
                <div className="font-geist text-[36px] tracking-[-0.03em] text-accent">
                  ${(m.monthly / m.seats).toFixed(2)}
                </div>
                <div className="text-[11px] text-muted-foreground">per user / month</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((p, idx) => (
            <Reveal key={p.name} delay={idx * 80}>
              <TierCard p={p} />
            </Reveal>
          ))}
        </div>
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <TrustStrip />
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <div className="rounded-2xl border border-border bg-muted/30 p-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              Usage in plain English
            </span>
          </div>
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                01 · Artifact
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-foreground/90">
                Any node in your trace graph — PRD, epic, story, AC, test, or commit-link.
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                02 · AI run
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-foreground/90">
                One generation or auto-trace call. A 10-person team typically uses 200–350 / month.
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                03 · Overage
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-foreground/90">
                Top-ups are <span className="text-accent">$19 / 100 runs</span>. Never auto-charged
                — you approve.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-5xl px-6">
        <h2 className="mb-8 font-geist text-[36px] leading-tight tracking-[-0.025em]">
          Compare plans.
        </h2>
        <ComparisonMatrix highlightCol={1} />
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-6">
        <h2 className="mb-8 font-geist text-[36px] leading-tight tracking-[-0.025em]">
          Questions{" "}
          <span className="font-serif italic text-foreground/70">finance will ask.</span>
        </h2>
        <FaqAccordion items={FAQ} />
      </section>

      <FinalCTA />
    </>
  );
}

/* ===================== Nav (lite, with variant switcher) ===================== */

function Nav({
  variant,
  onChange,
}: {
  variant: "v1" | "v2" | "v3";
  onChange: (v: "v1" | "v2" | "v3") => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-mono text-[11px] font-medium text-accent-foreground">
            OT
          </span>
          <span className="font-geist text-[15px] font-medium tracking-[-0.01em] text-foreground">
            OneTrace <span className="text-muted-foreground">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link to="/#problem" className="text-[13px] text-muted-foreground hover:text-foreground">
            Problem
          </Link>
          <Link to="/#solution" className="text-[13px] text-muted-foreground hover:text-foreground">
            Solution
          </Link>
          <Link to="/#how" className="text-[13px] text-muted-foreground hover:text-foreground">
            How it works
          </Link>
          <span className="text-[13px] font-medium text-foreground">Pricing</span>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/auth?mode=login"
            className="hidden text-[13px] text-muted-foreground hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link
            to="/auth?mode=signup"
            className="btn-3d btn-3d-primary inline-flex h-8 items-center gap-1 px-3 text-[12.5px] font-medium"
          >
            Start free <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent>
              <div className="mt-8 flex flex-col gap-4">
                <Link to="/#problem">Problem</Link>
                <Link to="/#solution">Solution</Link>
                <Link to="/#how">How it works</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Variant switcher — internal, remove after pick */}
      <div className="border-t border-border bg-muted/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Direction preview
          </span>
          <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
            {(
              [
                { id: "v1", label: "Editorial calm" },
                { id: "v2", label: "Technical / log-viewer" },
                { id: "v3", label: "Per-seat math" },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                onClick={() => onChange(v.id)}
                className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
                  variant === v.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ===================== Page ===================== */

export default function PricingPage() {
  const [variant, setVariant] = useState<"v1" | "v2" | "v3">("v1");
  return (
    <div className="min-h-screen bg-background text-foreground font-geist antialiased selection:bg-accent/20">
      <Nav variant={variant} onChange={setVariant} />
      {variant === "v1" && <VariantOne />}
      {variant === "v2" && <VariantTwo />}
      {variant === "v3" && <VariantThree />}
    </div>
  );
}
