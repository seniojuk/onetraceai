import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Command, GitBranch, Moon, Sparkles, Sun, Zap } from "lucide-react";
import { AccentWord } from "@/components/marketing/AccentWord";

/**
 * /design — OneTrace Design System
 *
 * Built entirely on the semantic tokens declared in `src/index.css` and exposed
 * via `tailwind.config.ts`. No hardcoded hex, no `text-zinc-*` raw palette use,
 * no `!important` override layer. The in-page theme toggle just flips the
 * `dark` className on the wrapper — Tailwind's standard `dark:` mechanism — so
 * the tokens (`--background`, `--card`, `--border`, `--status-*`, …) do all
 * the work and stay consistent with the rest of the app.
 */
export default function DesignSystemPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.title = "Design System — OneTrace";
  }, []);

  const isLight = theme === "light";

  return (
    <div
      className={`${
        isLight ? "" : "dark"
      } min-h-screen bg-background text-foreground font-geist antialiased`}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/60 text-[10px] font-semibold text-accent-foreground">
              OT
            </div>
            <span className="font-medium tracking-tight text-foreground">OneTrace</span>
            <span className="text-muted-foreground/70">/</span>
            <span className="text-muted-foreground">Design</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(isLight ? "dark" : "light")}
              aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
              className="btn-3d btn-3d-secondary inline-flex h-8 w-8 items-center justify-center"
            >
              {isLight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </button>
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
              <Command className="h-3 w-3" /> v1.0
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        {/* Hero */}
        <section className="mb-32">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Design System · v1.0
          </div>
          <h1 className="font-geist text-[64px] leading-[1.02] tracking-[-0.04em] text-foreground">
            A system for shipping
            <br />
            <AccentWord>enterprise software</AccentWord> with taste.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            The OneTrace design language is engineered for B2B teams who care about craft.
            Inspired by Linear, Vercel, and Resend — dense, precise, and quietly opinionated.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <button className="btn-3d btn-3d-primary group inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium">
              View components
              <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            <button className="btn-3d btn-3d-secondary inline-flex items-center gap-1.5 px-4 py-2 text-sm">
              Read principles
            </button>
          </div>
        </section>

        {/* Principles */}
        <Section eyebrow="01 — Principles" title="Code is the source of truth.">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="bg-card p-6">
                <p.icon className="h-4 w-4 text-accent" />
                <h3 className="mt-4 text-[15px] font-medium tracking-tight text-foreground">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section eyebrow="02 — Typography" title="Geist Sans · Instrument Serif · Geist Mono">
          <div className="space-y-px overflow-hidden rounded-xl border border-border">
            <TypeRow label="Display / 64" meta="Geist · -0.04em · 1.02">
              <span className="font-geist text-[56px] leading-none tracking-[-0.04em] text-foreground">
                Confidence, not crossed fingers.
              </span>
            </TypeRow>
            <TypeRow label="Display / Serif" meta="Instrument Serif · Italic">
              <span className="font-serif text-[48px] italic leading-none text-foreground/80">
                traceable by design
              </span>
            </TypeRow>
            <TypeRow label="Heading / 24" meta="Geist · 500 · -0.02em">
              <span className="text-[22px] font-medium tracking-[-0.02em] text-foreground">
                Every artifact has an owner.
              </span>
            </TypeRow>
            <TypeRow label="Body / 14" meta="Geist · 400 · 1.6">
              <span className="text-[14px] leading-[1.6] text-muted-foreground">
                OneTrace connects PRDs, stories, Jira, Git, and tests into one Artifact Graph —
                so every commit has intent, and every release has proof.
              </span>
            </TypeRow>
            <TypeRow label="Mono / 12" meta="Geist Mono · 500">
              <span className="font-mono text-[12px] tracking-tight text-accent">
                feat(graph): link PR #482 → STORY-217 → AC-9
              </span>
            </TypeRow>
          </div>
        </Section>

        {/* Color */}
        <Section eyebrow="03 — Color" title="Semantic tokens. One source of truth.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Swatch name="Background" token="--background" swatch="bg-background" />
            <Swatch name="Card" token="--card" swatch="bg-card" />
            <Swatch name="Muted" token="--muted" swatch="bg-muted" />
            <Swatch name="Border" token="--border" swatch="bg-border" />
            <Swatch name="Foreground" token="--foreground" swatch="bg-foreground" />
            <Swatch name="Muted FG" token="--muted-foreground" swatch="bg-muted-foreground" />
            <Swatch name="Accent · Teal" token="--accent" swatch="bg-accent" />
            <Swatch name="Destructive" token="--destructive" swatch="bg-destructive" />
          </div>
        </Section>

        {/* Buttons */}
        <Section eyebrow="04 — Buttons" title="Six variants. No more.">
          <div className="rounded-xl border border-border bg-card p-10">
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-3d btn-3d-primary inline-flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-medium">
                Primary <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <button className="btn-3d btn-3d-secondary inline-flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-medium">
                Secondary
              </button>
              <button className="btn-3d btn-3d-outline inline-flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-medium">
                Outline
              </button>
              <button className="btn-3d btn-3d-ghost inline-flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-medium">
                Ghost
              </button>
              <button className="btn-3d btn-3d-accent inline-flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Accent
              </button>
              <button className="btn-3d btn-3d-destructive inline-flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-medium">
                Destructive
              </button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className="btn-3d btn-3d-secondary inline-flex h-7 items-center gap-1.5 px-2.5 text-[12px]">
                Small
              </button>
              <button className="btn-3d btn-3d-primary inline-flex h-11 items-center gap-2 px-5 text-[14px] font-medium">
                Large action <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
              Press any button — physical depth, 80ms snap.
            </p>
          </div>
        </Section>

        {/* Surfaces & cards */}
        <Section eyebrow="05 — Surfaces" title="Subtle elevation. Hairline borders.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-[12px] text-muted-foreground">main · ENG-2703</span>
                </div>
                <StatusBadge status="story" label="In Progress" />
              </div>
              <h4 className="mt-4 text-[16px] font-medium tracking-tight text-foreground">Faster app launch</h4>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                Render UI before{" "}
                <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[11px] text-foreground/80">
                  vehicle_state
                </code>{" "}
                sync when minimum state is present.
              </p>
              <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-[12px] text-muted-foreground">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-status-prd to-status-test" />
                jori · 2h ago
              </div>
            </Card>

            <Card>
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Coverage</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-geist text-[40px] font-medium tracking-[-0.03em] text-foreground">94.2%</span>
                <span className="text-[12px] text-accent">+2.1%</span>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-accent to-accent/70" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
                {[
                  { label: "Stories", v: "217" },
                  { label: "Linked", v: "204" },
                  { label: "Drift", v: "3" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="font-mono text-[16px] text-foreground">{s.v}</div>
                    <div className="text-[11px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        {/* Badges + Input */}
        <Section eyebrow="06 — Tokens" title="Status, badges, inputs.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-6">
              {STATUSES.map((s) => (
                <StatusBadge key={s.key} status={s.key} label={s.label} mono />
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Input</label>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 focus-within:border-ring/60">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  placeholder="Search artifacts, commits, stories…"
                  className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/70 outline-none"
                />
                <kbd className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>
        </Section>

        {/* Motion */}
        <Section eyebrow="07 — Motion" title="Custom curves. Animate with purpose.">
          <p className="-mt-4 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Built-in CSS easings lack punch. We use stronger cubic-beziers, keep UI under
            300ms, and never animate keyboard-triggered actions. Every motion answers
            <em className="font-serif text-foreground/80"> why does this animate?</em>
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { k: "Press", v: "140ms", curve: "(0.23, 1, 0.32, 1)", d: "Buttons, taps. Instant feedback the UI heard you." },
              { k: "Hover / Popover", v: "180–200ms", curve: "(0.23, 1, 0.32, 1)", d: "Tooltips, dropdowns, color shifts." },
              { k: "Spatial", v: "340ms", curve: "(0.32, 0.72, 0, 1)", d: "Drawers, sheets. iOS-like drawer curve." },
            ].map((t) => (
              <div key={t.k} className="rounded-xl border border-border bg-card p-5">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t.k}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-geist text-[22px] font-medium tracking-tight text-foreground">{t.v}</span>
                  <span className="font-mono text-[11px] text-accent">{t.curve}</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{t.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Frequency rule</div>
              <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                <li className="flex gap-2"><span className="text-muted-foreground/50">·</span> 100×/day → no animation, ever</li>
                <li className="flex gap-2"><span className="text-muted-foreground/50">·</span> 10×/day → reduce drastically</li>
                <li className="flex gap-2"><span className="text-muted-foreground/50">·</span> Occasional → standard motion</li>
                <li className="flex gap-2"><span className="text-muted-foreground/50">·</span> Rare → can add delight</li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Non-negotiables</div>
              <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                <li className="flex gap-2"><span className="text-muted-foreground/50">·</span> Never <code className="font-mono text-foreground/80">transition: all</code></li>
                <li className="flex gap-2"><span className="text-muted-foreground/50">·</span> Never animate from <code className="font-mono text-foreground/80">scale(0)</code> — start at 0.95</li>
                <li className="flex gap-2"><span className="text-muted-foreground/50">·</span> Never <code className="font-mono text-foreground/80">ease-in</code> on UI</li>
                <li className="flex gap-2"><span className="text-muted-foreground/50">·</span> Popovers scale from trigger origin, not center</li>
              </ul>
            </div>
          </div>
        </Section>

        <footer className="mt-32 flex items-center justify-between border-t border-border pt-8 text-[12px] text-muted-foreground">
          <span>OneTrace · Design System v1.0</span>
          <span className="font-mono">/design</span>
        </footer>
      </main>
    </div>
  );
}

/* ---------- helpers ---------- */

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-24">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-[22px] font-medium tracking-[-0.02em] text-foreground">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function TypeRow({
  label,
  meta,
  children,
}: {
  label: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-6 bg-card px-6 py-8">
      <div className="col-span-12 md:col-span-3">
        <div className="text-[12px] text-foreground/80">{label}</div>
        <div className="font-mono text-[11px] text-muted-foreground">{meta}</div>
      </div>
      <div className="col-span-12 md:col-span-9">{children}</div>
    </div>
  );
}

function Swatch({
  name,
  token,
  swatch,
}: {
  name: string;
  token: string;
  swatch: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className={`h-20 w-full rounded-lg border border-border ${swatch}`} />
      <div className="mt-3 text-[13px] text-foreground">{name}</div>
      <div className="font-mono text-[11px] text-muted-foreground">{token}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:border-border/80">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-foreground/[0.02] to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </div>
  );
}

type StatusKey = "prd" | "epic" | "story" | "ac" | "test" | "commit";

const STATUSES: { key: StatusKey; label: string }[] = [
  { key: "prd", label: "PRD" },
  { key: "epic", label: "EPIC" },
  { key: "story", label: "STORY" },
  { key: "ac", label: "AC" },
  { key: "test", label: "TEST" },
  { key: "commit", label: "COMMIT" },
];

/**
 * Token-driven status badge. Uses bg-status-{key} / text-status-{key}-fg
 * which live in tailwind.config.ts and resolve via the --status-* CSS vars.
 * Tailwind needs literal class names to tree-shake; the explicit map below is
 * the safe pattern.
 */
const STATUS_CLASSES: Record<StatusKey, string> = {
  prd: "border-status-prd/30 bg-status-prd/10 text-status-prd-fg [&_.dot]:bg-status-prd",
  epic: "border-status-epic/30 bg-status-epic/10 text-status-epic-fg [&_.dot]:bg-status-epic",
  story: "border-status-story/30 bg-status-story/10 text-status-story-fg [&_.dot]:bg-status-story",
  ac: "border-status-ac/30 bg-status-ac/10 text-status-ac-fg [&_.dot]:bg-status-ac",
  test: "border-status-test/30 bg-status-test/10 text-status-test-fg [&_.dot]:bg-status-test",
  commit: "border-status-commit/30 bg-status-commit/10 text-status-commit-fg [&_.dot]:bg-status-commit",
};

function StatusBadge({
  status,
  label,
  mono = false,
}: {
  status: StatusKey;
  label: string;
  mono?: boolean;
}) {
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

const PRINCIPLES = [
  {
    icon: Check,
    title: "Be close to customers",
    body: "Every component earns its place from a real workflow. No decorative UI, no demo-only flourishes.",
  },
  {
    icon: Sparkles,
    title: "Craft is care",
    body: "Hairline borders, 1px subpixel detail, and motion under 340ms. The polish is the product.",
  },
  {
    icon: Zap,
    title: "Solve the hard problems",
    body: "Density without noise. Show the right insight, in the right place, at the right moment.",
  },
];
