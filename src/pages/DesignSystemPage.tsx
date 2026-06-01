import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Command, GitBranch, Moon, Sparkles, Sun, Zap } from "lucide-react";

/**
 * /design — OneTrace Design System
 * Linear / Vercel / Resend / Lovable inspired.
 * Dark + light, toggleable. Light overrides are scoped to [data-ds-theme="light"]
 * so they don't bleed into the rest of the app.
 */
export default function DesignSystemPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.title = "Design System — OneTrace";
  }, []);

  const isLight = theme === "light";

  return (
    <div
      data-ds-theme={theme}
      className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-geist antialiased"
    >
      <DesignSystemThemeStyles />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-teal-400 to-teal-600 text-[10px] font-semibold text-black">
              OT
            </div>
            <span className="font-medium tracking-tight">OneTrace</span>
            <span className="text-zinc-500">/</span>
            <span className="text-zinc-400">Design</span>
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
            <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-zinc-400 font-mono">
              <Command className="h-3 w-3" /> v1.0
            </div>
          </div>
        </div>
      </header>


      <main className="mx-auto max-w-6xl px-6 py-20">
        {/* Hero */}
        <section className="mb-32">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            Design System · v1.0
          </div>
          <h1 className="font-geist text-[64px] leading-[1.02] tracking-[-0.04em] text-white">
            A system for shipping
            <br />
            <span className="font-serif italic text-zinc-300">enterprise software</span> with taste.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-zinc-400">
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
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.06] md:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="bg-[#0A0A0A] p-6">
                <p.icon className="h-4 w-4 text-teal-400" />
                <h3 className="mt-4 text-[15px] font-medium text-white tracking-tight">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">{p.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section eyebrow="02 — Typography" title="Geist Sans · Instrument Serif · Geist Mono">
          <div className="space-y-px overflow-hidden rounded-xl border border-white/[0.08]">
            <TypeRow label="Display / 64" meta="Geist · -0.04em · 1.02">
              <span className="font-geist text-[56px] leading-none tracking-[-0.04em] text-white">
                Confidence, not crossed fingers.
              </span>
            </TypeRow>
            <TypeRow label="Display / Serif" meta="Instrument Serif · Italic">
              <span className="font-serif text-[48px] italic leading-none text-zinc-200">
                traceable by design
              </span>
            </TypeRow>
            <TypeRow label="Heading / 24" meta="Geist · 500 · -0.02em">
              <span className="text-[22px] font-medium tracking-[-0.02em] text-white">
                Every artifact has an owner.
              </span>
            </TypeRow>
            <TypeRow label="Body / 14" meta="Geist · 400 · 1.6">
              <span className="text-[14px] leading-[1.6] text-zinc-400">
                OneTrace connects PRDs, stories, Jira, Git, and tests into one Artifact Graph —
                so every commit has intent, and every release has proof.
              </span>
            </TypeRow>
            <TypeRow label="Mono / 12" meta="Geist Mono · 500">
              <span className="font-mono text-[12px] tracking-tight text-teal-300">
                feat(graph): link PR #482 → STORY-217 → AC-9
              </span>
            </TypeRow>
          </div>
        </Section>

        {/* Color */}
        <Section eyebrow="03 — Color" title="Restrained palette. Single accent.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Swatch name="Background" value="#0A0A0A" swatch="bg-[#0A0A0A] border-white/10" />
            <Swatch name="Surface" value="#111111" swatch="bg-[#111111] border-white/10" />
            <Swatch name="Elevated" value="#171717" swatch="bg-[#171717] border-white/10" />
            <Swatch name="Border" value="rgba(255,255,255,.08)" swatch="bg-white/[0.08] border-white/10" />
            <Swatch name="Text Primary" value="#FAFAFA" swatch="bg-zinc-50" />
            <Swatch name="Text Muted" value="#71717A" swatch="bg-zinc-500" />
            <Swatch name="Accent · Teal" value="hsl(173 80% 40%)" swatch="bg-teal-500" />
            <Swatch name="Accent · Glow" value="hsl(173 80% 45% / .25)" swatch="bg-teal-400/30 border-teal-400/30" />
          </div>
        </Section>

        {/* Buttons */}
        <Section eyebrow="04 — Buttons" title="Four variants. No more.">
          <div className="rounded-xl border border-white/[0.08] bg-[#0E0E0E] p-10">
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-3d btn-3d-primary inline-flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-medium">
                Primary <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <button className="btn-3d btn-3d-secondary inline-flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-medium">
                Secondary
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
            <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-zinc-600">Press any button — physical depth, 80ms snap.</p>
          </div>
        </Section>

        {/* Surfaces & cards */}
        <Section eyebrow="05 — Surfaces" title="Subtle elevation. Hairline borders.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-zinc-500" />
                  <span className="font-mono text-[12px] text-zinc-400">main · ENG-2703</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-400/20 bg-teal-400/10 px-2 py-0.5 text-[11px] text-teal-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400" /> In Progress
                </span>
              </div>
              <h4 className="mt-4 text-[16px] font-medium tracking-tight text-white">Faster app launch</h4>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                Render UI before <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px] text-zinc-300">vehicle_state</code> sync when minimum state is present.
              </p>
              <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-[12px] text-zinc-500">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500" />
                jori · 2h ago
              </div>
            </Card>

            <Card>
              <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Coverage</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-geist text-[40px] font-medium tracking-[-0.03em] text-white">94.2%</span>
                <span className="text-[12px] text-teal-300">+2.1%</span>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-teal-400 to-teal-300" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
                {[
                  { label: "Stories", v: "217" },
                  { label: "Linked", v: "204" },
                  { label: "Drift", v: "3" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="font-mono text-[16px] text-white">{s.v}</div>
                    <div className="text-[11px] text-zinc-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        {/* Badges */}
        <Section eyebrow="06 — Tokens" title="Status, badges, inputs.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 rounded-xl border border-white/[0.08] bg-[#0E0E0E] p-6">
              {[
                { label: "PRD", cls: "border-violet-400/20 bg-violet-400/10 text-violet-300", dot: "bg-violet-400" },
                { label: "EPIC", cls: "border-blue-400/20 bg-blue-400/10 text-blue-300", dot: "bg-blue-400" },
                { label: "STORY", cls: "border-teal-400/20 bg-teal-400/10 text-teal-300", dot: "bg-teal-400" },
                { label: "AC", cls: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300", dot: "bg-emerald-400" },
                { label: "TEST", cls: "border-amber-400/20 bg-amber-400/10 text-amber-300", dot: "bg-amber-400" },
                { label: "COMMIT", cls: "border-zinc-400/20 bg-zinc-400/10 text-zinc-300", dot: "bg-zinc-400" },
              ].map((b) => (
                <span
                  key={b.label}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-tight ${b.cls}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                  {b.label}
                </span>
              ))}
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0E0E0E] p-6">
              <label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Input</label>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus-within:border-white/20">
                <Zap className="h-3.5 w-3.5 text-zinc-500" />
                <input
                  placeholder="Search artifacts, commits, stories…"
                  className="flex-1 bg-transparent text-[13px] text-white placeholder:text-zinc-600 outline-none"
                />
                <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">⌘K</kbd>
              </div>
            </div>
          </div>
        </Section>

        {/* Motion */}
        <Section eyebrow="07 — Motion" title="Custom curves. Animate with purpose.">
          <p className="-mt-4 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
            Built-in CSS easings lack punch. We use stronger cubic-beziers, keep UI under
            300ms, and never animate keyboard-triggered actions. Every motion answers
            <em className="font-serif text-zinc-300"> why does this animate?</em>
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { k: "Press", v: "140ms", curve: "(0.23, 1, 0.32, 1)", d: "Buttons, taps. Instant feedback the UI heard you." },
              { k: "Hover / Popover", v: "180–200ms", curve: "(0.23, 1, 0.32, 1)", d: "Tooltips, dropdowns, color shifts." },
              { k: "Spatial", v: "340ms", curve: "(0.32, 0.72, 0, 1)", d: "Drawers, sheets. iOS-like drawer curve." },
            ].map((t) => (
              <div key={t.k} className="rounded-xl border border-white/[0.06] bg-[#0E0E0E] p-5">
                <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.k}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-geist text-[22px] font-medium tracking-tight text-white">{t.v}</span>
                  <span className="font-mono text-[11px] text-teal-300">{t.curve}</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">{t.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 rounded-xl border border-white/[0.08] bg-[#0E0E0E] p-6 md:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Frequency rule</div>
              <ul className="mt-3 space-y-2 text-[13px] text-zinc-400">
                <li className="flex gap-2"><span className="text-zinc-600">·</span> 100×/day → no animation, ever</li>
                <li className="flex gap-2"><span className="text-zinc-600">·</span> 10×/day → reduce drastically</li>
                <li className="flex gap-2"><span className="text-zinc-600">·</span> Occasional → standard motion</li>
                <li className="flex gap-2"><span className="text-zinc-600">·</span> Rare → can add delight</li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Non-negotiables</div>
              <ul className="mt-3 space-y-2 text-[13px] text-zinc-400">
                <li className="flex gap-2"><span className="text-zinc-600">·</span> Never <code className="font-mono text-zinc-300">transition: all</code></li>
                <li className="flex gap-2"><span className="text-zinc-600">·</span> Never animate from <code className="font-mono text-zinc-300">scale(0)</code> — start at 0.95</li>
                <li className="flex gap-2"><span className="text-zinc-600">·</span> Never <code className="font-mono text-zinc-300">ease-in</code> on UI</li>
                <li className="flex gap-2"><span className="text-zinc-600">·</span> Popovers scale from trigger origin, not center</li>
              </ul>
            </div>
          </div>
        </Section>

        <footer className="mt-32 flex items-center justify-between border-t border-white/[0.06] pt-8 text-[12px] text-zinc-500">
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
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-[22px] font-medium tracking-[-0.02em] text-white">{title}</h2>
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
    <div className="grid grid-cols-12 items-center gap-6 bg-[#0E0E0E] px-6 py-8">
      <div className="col-span-12 md:col-span-3">
        <div className="text-[12px] text-zinc-300">{label}</div>
        <div className="font-mono text-[11px] text-zinc-500">{meta}</div>
      </div>
      <div className="col-span-12 md:col-span-9">{children}</div>
    </div>
  );
}

function Swatch({
  name,
  value,
  swatch,
}: {
  name: string;
  value: string;
  swatch: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0E0E0E] p-3">
      <div className={`h-20 w-full rounded-lg border ${swatch}`} />
      <div className="mt-3 text-[13px] text-white">{name}</div>
      <div className="font-mono text-[11px] text-zinc-500">{value}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E0E0E] p-6 transition hover:border-white/[0.14]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </div>
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

/**
 * Scoped light-mode overrides for the /design page only.
 * Targets every dark utility actually used on the page and
 * remaps it to a light equivalent. Scoped via [data-ds-theme="light"]
 * so nothing leaks into the rest of the app.
 */
function DesignSystemThemeStyles() {
  return (
    <style>{`
      [data-ds-theme="light"] {
        color-scheme: light;
      }

      /* Surfaces */
      [data-ds-theme="light"].bg-\\[\\#0A0A0A\\],
      [data-ds-theme="light"] .bg-\\[\\#0A0A0A\\] { background-color: #FAFAF7 !important; }
      [data-ds-theme="light"] .bg-\\[\\#0E0E0E\\] { background-color: #FFFFFF !important; }
      [data-ds-theme="light"] .bg-\\[\\#111111\\] { background-color: #F4F4F2 !important; }
      [data-ds-theme="light"] .bg-\\[\\#171717\\] { background-color: #EDEDEA !important; }

      /* Translucent dark fills → translucent black on light */
      [data-ds-theme="light"] .bg-white\\/\\[0\\.03\\] { background-color: rgba(0,0,0,0.025) !important; }
      [data-ds-theme="light"] .bg-white\\/\\[0\\.05\\] { background-color: rgba(0,0,0,0.04) !important; }
      [data-ds-theme="light"] .bg-white\\/\\[0\\.06\\] { background-color: rgba(0,0,0,0.05) !important; }
      [data-ds-theme="light"] .bg-white\\/\\[0\\.08\\] { background-color: rgba(0,0,0,0.07) !important; }
      [data-ds-theme="light"] .bg-black\\/40 { background-color: rgba(0,0,0,0.04) !important; }

      /* Borders */
      [data-ds-theme="light"] .border-white\\/10 { border-color: rgba(0,0,0,0.1) !important; }
      [data-ds-theme="light"] .border-white\\/20 { border-color: rgba(0,0,0,0.18) !important; }
      [data-ds-theme="light"] .border-white\\/\\[0\\.06\\] { border-color: rgba(0,0,0,0.07) !important; }
      [data-ds-theme="light"] .border-white\\/\\[0\\.08\\] { border-color: rgba(0,0,0,0.09) !important; }
      [data-ds-theme="light"] .border-white\\/\\[0\\.14\\] { border-color: rgba(0,0,0,0.15) !important; }

      /* Text — invert the zinc scale */
      [data-ds-theme="light"] .text-white { color: #0A0A0A !important; }
      [data-ds-theme="light"] .text-zinc-100 { color: #18181B !important; }
      [data-ds-theme="light"] .text-zinc-200 { color: #27272A !important; }
      [data-ds-theme="light"] .text-zinc-300 { color: #3F3F46 !important; }
      [data-ds-theme="light"] .text-zinc-400 { color: #52525B !important; }
      [data-ds-theme="light"] .text-zinc-500 { color: #71717A !important; }
      [data-ds-theme="light"] .text-zinc-600 { color: #A1A1AA !important; }

      /* Color swatch demos that show literal scale values — keep them readable */
      [data-ds-theme="light"] .bg-zinc-50 { background-color: #FAFAFA !important; }
      [data-ds-theme="light"] .bg-zinc-400 { background-color: #A1A1AA !important; }
      [data-ds-theme="light"] .bg-zinc-500 { background-color: #71717A !important; }

      /* Sticky header backdrop */
      [data-ds-theme="light"] header.bg-\\[\\#0A0A0A\\]\\/80 { background-color: rgba(250,250,247,0.8) !important; }

      /* Light-mode buttons: invert the dark recipe */
      [data-ds-theme="light"] .btn-3d-secondary {
        background: rgba(0,0,0,0.04);
        color: #18181B;
        box-shadow:
          0 1px 0 rgba(0,0,0,0.08),
          inset 0 1px 0 rgba(255,255,255,0.9),
          inset 0 0 0 1px rgba(0,0,0,0.06);
      }
      [data-ds-theme="light"] .btn-3d-secondary:hover { background: rgba(0,0,0,0.07); color: #09090B; }
      [data-ds-theme="light"] .btn-3d-secondary:active {
        background: rgba(0,0,0,0.05);
        box-shadow: inset 0 2px 3px rgba(0,0,0,0.12);
      }
      [data-ds-theme="light"] .btn-3d-ghost { color: #52525B; }
      [data-ds-theme="light"] .btn-3d-ghost:hover { background: rgba(0,0,0,0.04); color: #09090B; }
      [data-ds-theme="light"] .btn-3d-ghost:active {
        background: rgba(0,0,0,0.06);
        box-shadow: inset 0 2px 3px rgba(0,0,0,0.1);
      }
      /* Solid buttons in light mode — clean fills, no outer drop shadow,
         just a single hairline border + crisp top highlight. */
      [data-ds-theme="light"] .btn-3d-primary {
        background: #0A0A0A;
        color: #FAFAFA;
        box-shadow:
          inset 0 0 0 1px #000000,
          inset 0 1px 0 rgba(255,255,255,0.14);
      }
      [data-ds-theme="light"] .btn-3d-primary:hover { background: #18181B; }
      [data-ds-theme="light"] .btn-3d-primary:active {
        background: #000000;
        box-shadow:
          inset 0 0 0 1px #000000,
          inset 0 2px 3px rgba(0,0,0,0.5);
      }

      [data-ds-theme="light"] .btn-3d-accent {
        background: hsl(173 80% 38%);
        color: #ffffff;
        box-shadow:
          inset 0 0 0 1px hsl(173 90% 24%),
          inset 0 1px 0 rgba(255,255,255,0.22);
      }
      [data-ds-theme="light"] .btn-3d-accent:hover { background: hsl(173 80% 34%); }
      [data-ds-theme="light"] .btn-3d-accent:active {
        background: hsl(173 82% 30%);
        box-shadow:
          inset 0 0 0 1px hsl(173 90% 20%),
          inset 0 2px 3px rgba(0,0,0,0.28);
      }

      [data-ds-theme="light"] .btn-3d-destructive {
        background: #fff1f1;
        color: #b91c1c;
        box-shadow:
          inset 0 0 0 1px rgba(220,38,38,0.3),
          inset 0 1px 0 rgba(255,255,255,0.6);
      }
      [data-ds-theme="light"] .btn-3d-destructive:hover { background: #ffe4e4; color: #991b1b; }
      [data-ds-theme="light"] .btn-3d-destructive:active {
        background: #ffd6d6;
        box-shadow:
          inset 0 0 0 1px rgba(220,38,38,0.35),
          inset 0 2px 3px rgba(220,38,38,0.18);
      }
    `}</style>
  );
}
