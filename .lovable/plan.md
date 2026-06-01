## What's wrong today

The `/design` page does **not** use semantic tokens. Concrete evidence:

- Surfaces are hardcoded hex: `bg-[#0A0A0A]`, `bg-[#0E0E0E]`, `bg-[#111111]`, `bg-[#171717]`
- Text uses raw Tailwind palette: `text-white`, `text-zinc-100..600`
- Borders are raw alpha: `border-white/[0.06]`, `border-white/[0.08]`, `border-white/10`
- Status colors are raw palette: `bg-teal-400/10 text-teal-300`, `bg-violet-400/10 text-violet-300`, etc.
- Light mode is faked with a 160-line `<style>` block of `[data-ds-theme="light"] … !important` overrides bolted onto the bottom of the file
- The `btn-3d-*` light-mode variants live inside that same override block (page-scoped), so the buttons don't theme correctly anywhere else in the app

Meanwhile `index.css` already defines a complete semantic token set (`--background`, `--card`, `--muted`, `--accent`, `--border`, `--success`, `--drift`, etc.) with a proper `:root` + `.dark` split, all wired into `tailwind.config.ts` as `bg-background`, `bg-card`, `border-border`, `text-muted-foreground`, etc.

## The overhaul

### 1. Extend tokens in `src/index.css`

Add what the design page actually needs and the global system is missing:

- **Surface scale** — `--surface` (page bg, slightly off background), `--surface-elevated` (cards), `--surface-sunken` (input wells), `--hairline` (subpixel border alpha)
- **Status palette** — one HSL pair per artifact type, with light + dark values:
  ```text
  --status-prd / --status-prd-fg     (violet)
  --status-epic / --status-epic-fg   (blue)
  --status-story / --status-story-fg (teal)
  --status-ac / --status-ac-fg       (emerald)
  --status-test / --status-test-fg   (amber)
  --status-commit / --status-commit-fg (zinc)
  ```
  All HSL, all defined under both `:root` and `.dark`, with light values tuned for WCAG AA on white.

### 2. Wire new tokens into `tailwind.config.ts`

Extend `theme.colors` with `surface`, `surface-elevated`, `surface-sunken`, `hairline`, and a `status.{prd,epic,story,ac,test,commit}` family — so the page can write `bg-surface-elevated`, `border-hairline`, `bg-status-story/10 text-status-story-fg`.

### 3. Consolidate button theming in `src/index.css`

Move the `btn-3d-*` **light-mode recipes** out of the page's `<style>` block and into `@layer components` in `index.css`:

- Default (light): the current "no outer shadow, hairline border + inset highlight" recipe
- `.dark .btn-3d-*`: the existing dark recipe (raised, soft drop shadow)

Result: every page in the app gets correctly themed buttons automatically. The page-scoped overrides go away.

### 4. Rewrite `DesignSystemPage.tsx`

- Swap the `data-ds-theme` toggle for toggling the **`dark` className** on the wrapper div (uses Tailwind's built-in dark variant — same mechanism as the rest of the app, just scoped to this page)
- Replace every hardcoded color/zinc/white-alpha class with the semantic equivalent:
  ```text
  bg-[#0A0A0A]        → bg-background
  bg-[#0E0E0E]        → bg-card  (or bg-surface-elevated)
  bg-[#111111]/171717 → bg-surface-sunken / bg-muted
  border-white/[0.06] → border-border  (or border-hairline)
  text-white          → text-foreground
  text-zinc-400/500   → text-muted-foreground
  bg-teal-400/10 etc. → bg-status-story/10  (data-driven map)
  ```
- Delete the entire `DesignSystemThemeStyles` `<style>` block and its 160 lines of `!important` overrides
- Status-badge data table becomes a single `STATUS = [{ key: "prd", label: "PRD" }, …]` and the JSX reads `bg-status-${key}/10 text-status-${key}-fg border-status-${key}/25`

### 5. Verify

- Visual QA in dark mode (default) — should look identical to today
- Toggle to light mode — should look like the current light mode but driven entirely by tokens (no `!important`, no scoped style block)
- Spot-check buttons on at least one other page (CDPlayer) to confirm light/dark behavior is unchanged or improved

## Out of scope

- No changes to other pages' content
- No new components beyond the outline button (already added)
- No changes to `src/integrations/supabase/*` or any backend

## Files touched

- `src/index.css` — add tokens, move button light recipes into `@layer components`
- `tailwind.config.ts` — expose new tokens
- `src/pages/DesignSystemPage.tsx` — full rewrite of the body, deletion of the override `<style>` block
