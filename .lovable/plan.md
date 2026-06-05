
# Onboarding Redesign — 8-Minute Graph Moment

Goal: get a new user from signup to a fully populated Artifact Graph in under 8 minutes, with motion guiding the eye through every step. Built on the existing design system (semantic tokens, `font-display`, status colors), the existing copy voice (terse, no em-dashes, narrative sublines), and the existing build principles (one focused component per screen, animations from `tailwind.config.ts` keyframes).

## Scope (this round)

1. **Post-Signup Screen** — "What are you building right now?"
2. **Choose Your Path Screen** — Demo vs. Real project
3. **Demo Project Template** — One-click pre-populated SaaS PRD → Epics → Stories → ACs
4. **5-Step Wizard** — Name → Describe → PRD → Epics → Graph
5. **The Graph Moment** — Animated reveal with single callout
6. **Dashboard Checklist** — Persistent setup checklist widget
7. **Email Sequence** — 3 emails (graph moment, 24h next steps, 48h health)

## What stays out of scope

- Pre-signup landing graph (already shipped)
- Pricing page changes (already shipped)
- Design partner outreach, sales motion, ICP messaging on marketing pages
- Per-user OAuth, GitHub/Jira wizard rework
- Email domain setup itself (only the 3 templates + queue trigger)

## Architecture

### New route + flow

Replace the current `OnboardingPage.tsx` step machine with a richer one:

```
/onboarding
  step = 'seed'        → "What are you building?" (single textarea)
  step = 'workspace'   → quick workspace name (if none)  [auto-skip if exists]
  step = 'path'        → Demo project | Real project
  step = 'wizard'      → 5-step guided trace (real path only)
  step = 'graph'       → /graph?welcome=1 with animated reveal overlay
```

The seed text from step 1 is persisted to `uiStore` and seeded into both paths (demo subtitle + wizard PRD prompt).

### New / changed files

```
src/pages/OnboardingPage.tsx                    rewrite — step orchestrator + motion
src/components/onboarding/SeedPromptStep.tsx    new — "What are you building?"
src/components/onboarding/ChoosePathStep.tsx    new — Demo vs Real, two big cards
src/components/onboarding/GuidedWizard.tsx      new — 5-step PRD→Epic flow
src/components/onboarding/StepProgress.tsx      new — slim mortar-grid progress bar
src/components/onboarding/GraphMomentOverlay.tsx new — animated tooltip on /graph
src/components/onboarding/SetupChecklist.tsx    new — dashboard widget
src/lib/demoProjectTemplate.ts                  new — seed PRD/Epics/Stories/ACs
src/hooks/useOnboardingChecklist.ts             new — computes 5 checklist states
src/pages/Dashboard.tsx                         edit — mount SetupChecklist above pulse strip when incomplete
src/pages/GraphPage.tsx                         edit — read ?welcome=1 and mount GraphMomentOverlay
src/store/uiStore.ts                            edit — add onboardingSeed, dismissedChecklist
src/index.css                                   edit — add keyframes: node-pop, edge-draw, eye-pull
tailwind.config.ts                              edit — register the new animations
```

### Backend

- **Demo project seeding**: client-side only. Reuse `useCreateProject` then bulk-insert artifacts via existing `artifacts` hooks. No new edge function.
- **3 onboarding emails**: scaffold transactional email function once, then send from:
  - `graph` step (immediate, "Your first trace is live")
  - cron or trigger 24h after signup (next-step nudge)
  - cron or trigger 48h after signup (project health: coverage %)
  - Implementation note: store a single `onboarding_emails` table with `user_id, kind, send_after, sent_at` rows inserted at signup; a `pg_cron` job picks up due rows hourly and calls `send-transactional-email`. RLS: user can read own rows; service_role full.

### Design system usage

- Hero typography on each step uses `font-display text-[40px] sm:text-[56px]` like Dashboard/Drift hero
- Mortar-grid containers (`gap-px bg-border/60`) for option cards on the Choose Path screen
- Status pill eyebrow ONLY on the seed step ("Setup · 1 of 5"), in line with the rule that eyebrows only appear on the Drift page (this is also a status-driven progress indicator, not a vibe label)
- Buttons: `variant="accent"` for the single primary CTA per screen, `ghost` for back/skip
- Colors: `bg-status-prd`, `bg-status-epic`, `bg-status-story`, `bg-status-ac` for the demo template node legend and graph reveal
- No em-dashes in any copy

## Motion plan

All animations use Tailwind keyframes (no new libs). New keyframes registered in `tailwind.config.ts`:

- `node-pop` — scale 0.6 → 1, opacity 0 → 1, 400ms cubic-bezier
- `edge-draw` — stroke-dashoffset 100 → 0, 600ms ease-out
- `eye-pull` — subtle 1px translateY + opacity pulse on the active CTA, 1.6s infinite, used only on the single next-action button per screen

Per-screen motion choreography:

- **Seed**: hero text `fade-in`, textarea `fade-in` delay-150, CTA `eye-pull` once user types
- **Choose Path**: two cards `scale-in` staggered 80ms; on hover, target card grows shadow + draws a faint accent border via `border-beam`-style sweep done with a CSS gradient
- **Wizard**: each step transitions with `fade-in` on enter, the completed step's checkbox does `scale-in` then settles; progress bar segments fill left-to-right with a 300ms width transition
- **Graph Moment**: PRD node pops first, then Epic nodes pop sequentially with 120ms stagger, edges `edge-draw` between them, then the callout tooltip `fade-in` with `eye-pull` on its CTA
- **Dashboard Checklist**: each item appears with `fade-in` stagger; when an item is checked, it animates strike-through + slides to bottom

## 5-Step Wizard detail

```
[1/5] Name your project         → input only, autogenerated key suggestion
[2/5] Describe what you're building → textarea pre-filled with seed answer
[3/5] Review your PRD           → generate-prd edge function, editable result
[4/5] Generate your first Epics → generate-epics, shows 3 epic cards
[5/5] See your Artifact Graph   → navigates to /graph?welcome=1
```

Each step renders inside a single `Card`-less centered column with the slim progress bar pinned to the top. Back arrow always available; primary CTA always bottom-right with `eye-pull`.

## Demo Project Template

`src/lib/demoProjectTemplate.ts` exports a single SaaS sample: "Acme Notes — collaborative note-taking with shared workspaces." It contains:

- 1 PRD (~600 words)
- 3 Epics (auth, editor, sharing)
- 6 Stories (2 per epic)
- 12 Acceptance Criteria
- 4 Test Cases (one marked failing for a realistic coverage score around 75%)

On selection: create project with key `DEMO`, bulk-insert artifacts and edges, navigate straight to `/graph?welcome=1`.

## Dashboard Checklist

`SetupChecklist` mounts above the pulse strip when `useOnboardingChecklist().completed < 5` and `!dismissedChecklist`. Items:

1. Created your first PRD
2. Generated Epics
3. Generated Stories from your Epics
4. Connected your GitHub repo
5. Pushed your first Epic to Jira

Each row: checkbox dot (status color), label, time estimate, CTA `→`. Dismiss control hides it permanently (uiStore flag). Computed live from artifacts + integration hooks.

## Email Sequence

Three React Email templates under `supabase/functions/_shared/email-templates/onboarding/`:
- `graph-live.tsx` — sent immediately when wizard hits graph step
- `next-steps.tsx` — 24h after signup
- `health-report.tsx` — 48h after signup, includes computed coverage %

Brand styling pulled from `src/index.css` tokens, single accent CTA per email, same voice as the app.

## Acceptance check

- Demo path: signup → 60s to graph
- Real path: signup → graph in under 8 minutes with 5 clear progress beats
- Every screen has exactly one primary CTA and motion drawing the eye to it
- Checklist appears on dashboard until all 5 items done or user dismisses
- Three onboarding emails enqueued at signup and rendered with project tokens
- No em-dashes; eyebrows only on the wizard progress indicator and Drift page

## Build order

1. uiStore + checklist hook + demo template data
2. Seed + Choose Path + StepProgress + Wizard screens (frontend only, no emails)
3. Demo project bulk-seed + Graph moment overlay
4. Dashboard checklist widget
5. Email templates + queue table + cron trigger
