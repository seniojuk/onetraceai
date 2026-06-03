# OneTrace App Redesign — Shell First, Pages Second

You picked: existing design system (warm paper / near-black sidebar / teal accent / Aleo serif), persistent sidebar + dense panels. Build from there.

## First principles

1. **One source of truth for UI tokens.** Every surface uses `bg-card`, `bg-surface-sunken`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-accent`. No raw colors (`text-purple-800`, `bg-amber-500`, etc.). Today the codebase leaks Tailwind palette colors in `artifact-badge-*` and status dots — those become tokens.
2. **Shell is a workbench, not a homepage.** The user lives here for hours. Density, calm, no decoration that doesn't earn its pixels. Linear/Height/Vercel as North Star — not "dashboard with widgets."
3. **Information hierarchy = what to do next.** Dashboard's job is: *"what changed, what's broken, what should I touch."* Not a stats trophy case.
4. **Motion is feedback, not flourish.** Tasteful: 200ms fade/scale on mount, hover lift on actionable surfaces, no infinite floaters in the app shell.
5. **Shadcn consistency.** Use `Card`, `Button`, `Tabs`, `Separator`, `Badge`, `Tooltip` everywhere. Kill bespoke `.feature-card`, `.integration-card`, `.card-hover` once shadcn covers them.

## Scope — phased

### Phase 1 (this turn): Shell + Dashboard + token cleanup

**Shell (`AppLayout.tsx`)**
- Replace bespoke sidebar markup with shadcn's `Sidebar` primitives (`Sidebar`, `SidebarProvider`, `SidebarMenu`, `SidebarTrigger`) — fixes collapse animation, keyboard nav, mobile sheet behavior for free. Keeps all 12 nav items (per project memory), preserves icons in collapsed state.
- Header becomes a true command bar: workspace/project switcher (compact), global `⌘K` search slot, breadcrumbs, theme toggle, user menu. Remove duplicated workspace switcher between sidebar and header — one canonical home (header).
- Sidebar keeps the dark recipe but slims: tighter spacing, section labels in `text-[11px] uppercase tracking-wider text-sidebar-foreground/50`, active item gets `bg-sidebar-accent` with a 2px teal left border instead of full primary fill (calmer, more pro).
- Mobile: sidebar becomes a sheet (shadcn handles this).

**Dashboard (`Dashboard.tsx`)**
Rebuilt around three questions a user actually asks:
- **Pulse strip** (top, 1 row): coverage %, drift count, stories in flight, AC satisfaction — same data as today but as one continuous hairline-divided strip instead of 4 floating cards. Numbers big, labels small, no decorative icon boxes.
- **What needs you** (left 2/3): single feed — open drift findings + in-progress stories without coverage + stale artifacts — each row actionable (Resolve / Open / Generate ACs). Replaces today's separate "Drift" and "Recent Artifacts" cards.
- **Coverage & momentum** (right 1/3): sparkline of coverage over time + top 5 lowest-coverage stories with inline progress. Replaces the static stats trophy.
- **Quick actions** moves into a `⌘K`-style compact command row at the page top, not a 4-card grid.
- Empty / no-project state: keep but restyled to match.

**Token hygiene (`index.css`)**
- Replace `.artifact-badge-*` raw Tailwind palette classes with `bg-status-{type}/10 text-status-{type}-fg border border-status-{type}/20` — they already exist as tokens, just unused.
- Replace `.status-dot-*` raw colors with semantic tokens.
- Mark `.card-hover` deprecated; introduce `.lift-subtle` (no translate, only border + shadow) for in-app surfaces — translate-on-hover feels marketing, not pro tool.

### Phase 2 (follow-up, after Phase 1 approval):
Cascade the same patterns to: Artifacts list, Artifact detail, Coverage, Drift, Graph, Lineage, AI Agents, Prompt Generator, Integrations, Team, Billing, Settings. Each gets: shadcn-native primitives, hairline-divided sections, tokenized colors, calm motion. Page-by-page, smallest first.

## Technical details (Phase 1)

Files changed:
- `src/components/layout/AppLayout.tsx` — rewrite using `src/components/ui/sidebar.tsx` shadcn primitives.
- `src/pages/Dashboard.tsx` — restructure into pulse strip + needs-you feed + momentum rail.
- `src/index.css` — tokenize `.artifact-badge-*` and `.status-dot-*`; add `.lift-subtle`; remove unused decorative classes.
- No backend changes. No new dependencies. No route changes.

Out of scope:
- Logic changes (hooks, queries, mutations stay identical).
- Brand/landing pages (already in good shape).
- Page-level redesigns beyond Dashboard (Phase 2).

Approve and I'll ship Phase 1. After you see it live we decide which interior page to redesign next.
