# Strata — Design Spec: M5 · Theming & Visual Polish

- **Date:** 2026-05-23
- **Status:** Design — awaiting review before implementation planning
- **Scope of this document:** Milestone 5 only. Builds on M1 (CSS-custom-property token foundation from Plan 7).

---

## 1. Overview

M5 takes Strata from "looks fine" to **"looks great out of the box, and easy
to brand."** It standardizes the visual layer: a tree-shakeable icon system
replaces the ad hoc text glyphs (`▾`, `▸`, `▼`) scattered across components, a
density prop adjusts row spacing without a full theme swap, additional theme
presets (high-contrast, dark variants) ship by default, and a `createTheme`
helper lets consumers compose branded themes at runtime.

The key architectural principle: **everything visual is driven by CSS custom
properties (tokens) defined in `strata.css`.** M5 adds new tokens and a
runtime composer, but does not change any component's structural markup. No
M1–M4 features need to be reworked.

---

## 2. Goals & non-goals

### Goals (M5)

- **Icon system** — adopt Lucide React behind a `<StrataIcon>` abstraction.
  All built-in icons (expand, collapse, sort, filter, pin, drag, edit, save,
  cancel, undo, redo, copy, paste, export, search, refresh, warning, loading)
  share one source. Consumers can override any icon by name.
- **Icon accessibility contract** — icon-only controls expose accessible
  labels via `aria-label`; decorative icons are `aria-hidden`. Semantics are
  owned by the *caller*, not the SVG.
- **Icon theme tokens** — size, stroke width, color, hover/disabled colors,
  and per-density overrides are all token-driven.
- **Density prop** — `density: 'compact' | 'standard' | 'comfortable'`
  switches a small set of spacing/font tokens. Row heights:
  compact = 28px, standard = 36px (default), comfortable = 44px.
- **Row striping** — `striped` prop toggles zebra-striped row backgrounds.
- **Additional theme presets** — `high-contrast-light`, `high-contrast-dark`
  (WCAG 2.1 AAA-compliant contrast), alongside existing `light` / `dark`.
- **Runtime theme composition** — `createTheme(baseTheme, overrides)` returns
  a scoped className that applies token overrides without globally polluting
  styles.
- **`prefers-color-scheme` auto-detection** — `theme="auto"` follows the OS
  preference via `matchMedia`.
- **Smooth theme transitions** — opt-in `transitions` prop enables CSS
  transitions on token changes so theme/density swaps don't flash.
- **Custom scrollbar styling** — themed track/thumb for WebKit and Firefox
  via CSS, respecting density tokens.
- **Print stylesheet** — `@media print` rules disable virtualization and
  render the currently-loaded + expanded row set as a clean static table.

### Non-goals (M5)

- A formal theme editor UI (consumers compose themes in code).
- Re-skinning M3's drag-drop indicators (already token-driven from M1 Plan 7).
- Backward-incompatible token renames (all M1–M4 token names preserved).
- Bundled icon fonts (we render SVG, not glyphs).
- Right-to-left layout (deferred to M7).
- Animation framework beyond CSS transitions.

---

## 3. Architecture

### 3.1 Icon system

```ts
// src/icons/icon-registry.ts
export type StrataIconName =
  | 'chevron-right' | 'chevron-down'      // tree expand/collapse
  | 'arrow-up' | 'arrow-down'             // sort
  | 'filter' | 'filter-active'            // filter button
  | 'pin' | 'pin-off'                     // column pin
  | 'grip-vertical'                       // drag handle
  | 'pencil' | 'check' | 'x'              // edit/save/cancel
  | 'undo' | 'redo'
  | 'copy' | 'clipboard'                  // copy/paste
  | 'download'                            // export
  | 'search'                              // quick search
  | 'refresh-cw'                          // reload
  | 'alert-triangle'                      // warnings
  | 'loader-2'                            // loading spinner
  | 'eye' | 'eye-off'                     // column visibility
  | 'chevrons-left' | 'chevrons-right'    // pagination jump
  | 'chevron-left'; // pagination prev

export interface StrataIconProps {
  name: StrataIconName;
  /** Accessible label. Required for interactive icons; omit for decorative. */
  label?: string;
  /** Size in px. Defaults to the icon size token for current density. */
  size?: number;
  /** Additional className for one-off styling. */
  className?: string;
}
```

`<StrataIcon name="..." label="..." />` is the single consumption point.
Internally it delegates to the registered icon set; the default registration
maps each name to a Lucide React component. Consumers can override:

```ts
<DataGrid icons={{ 'chevron-down': MyChevronDown }} ... />
```

**Bundle impact:** Lucide imports are per-icon, so only the 22 names above are
pulled into the default bundle. Tree-shaking removes everything else.

**Accessibility rule:**
- If `label` is provided → icon renders as `<svg role="img" aria-label="...">`.
- If `label` is omitted → icon renders as `<svg aria-hidden="true">` and the
  *caller* must provide an accessible name on the surrounding control
  (e.g., `<button aria-label="Sort ascending">`).

### 3.2 Density

A new token group keyed by density:

```css
/* strata.css */
:root,
[data-strata-density="standard"] {
  --strata-row-height: 36px;
  --strata-cell-padding-x: 12px;
  --strata-cell-padding-y: 8px;
  --strata-font-size: 14px;
  --strata-icon-size: 16px;
  --strata-header-height: 40px;
}

[data-strata-density="compact"] {
  --strata-row-height: 28px;
  --strata-cell-padding-x: 8px;
  --strata-cell-padding-y: 4px;
  --strata-font-size: 13px;
  --strata-icon-size: 14px;
  --strata-header-height: 32px;
}

[data-strata-density="comfortable"] {
  --strata-row-height: 44px;
  --strata-cell-padding-x: 16px;
  --strata-cell-padding-y: 12px;
  --strata-font-size: 15px;
  --strata-icon-size: 18px;
  --strata-header-height: 48px;
}
```

`<DataGrid density="compact">` sets `data-strata-density` on the grid root.
`useRowVirtualizer` reads `--strata-row-height` from the computed style to
size virtual rows correctly.

**Caveat:** changing density mid-session invalidates the row virtualizer's
cached measurements. The `ResizeObserver` already attached to the grid root
will pick up height changes, but virtualization needs a hook to re-measure.
Plan 3 covers this.

### 3.3 Runtime theme composition

```ts
// src/themes/create-theme.ts
export interface ThemeOverrides {
  /** CSS custom property values, keyed by token name without the leading `--`. */
  tokens: Partial<Record<string, string>>;
}

export interface ComposedTheme {
  /** Scoped className to apply on the grid root. */
  className: string;
  /** Cleanup — removes the injected style tag. */
  dispose(): void;
}

export function createTheme(
  base: 'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark',
  overrides: ThemeOverrides,
): ComposedTheme;
```

`createTheme` injects a `<style>` tag with a unique class:

```css
.strata-theme-abc123 {
  --strata-accent: #0071e3;
  --strata-row-hover-bg: #f5f5f7;
  /* ...rest of overrides */
}
```

`<DataGrid theme={composedTheme.className}>` then takes a string, which the
grid applies via a className. The existing `'light' | 'dark'` string union is
extended to also accept any string (treated as a className).

**Cleanup:** `dispose()` removes the injected style tag. React consumers should
call it in a `useEffect` cleanup.

### 3.4 `theme="auto"` and prefers-color-scheme

```tsx
<DataGrid theme="auto">
```

A small internal hook subscribes to `matchMedia('(prefers-color-scheme: dark)')`
and toggles between the `light` and `dark` presets. Composed themes are not
auto-resolved — for branded themes the consumer specifies the resolution
explicitly (`theme={isDark ? darkBrand : lightBrand}`).

### 3.5 Smooth transitions

A new `transitions` prop (default `false`) opts into CSS transitions on
token-driven properties:

```css
.strata-grid[data-strata-transitions="true"] .strata-cell,
.strata-grid[data-strata-transitions="true"] .strata-header-cell {
  transition: background-color 150ms ease, color 150ms ease;
}
```

Disabled by default because transitions during fast scroll cause perceptible
lag on lower-end devices.

### 3.6 Scrollbar styling

Cross-browser themed scrollbars via `::-webkit-scrollbar` and Firefox's
`scrollbar-color` / `scrollbar-width`. Sizes are bound to density tokens
(thinner in compact). The existing custom horizontal scrollbar in
`GridRoot.tsx` is theme-aware already; this adds matching styling for the
*native* vertical scrollbar that `BodyViewport` exposes.

### 3.7 Print stylesheet

```css
@media print {
  .strata-grid {
    overflow: visible !important;
  }
  .strata-virtual-padding-before,
  .strata-virtual-padding-after {
    display: none;
  }
  .strata-row,
  .strata-cell,
  .strata-header-cell {
    page-break-inside: avoid;
  }
  .strata-horizontal-scrollbar-row,
  .strata-footer { display: none; }
}
```

A pre-print hook (`window.matchMedia('print').addEventListener`) flips the
row virtualizer into "render-all-loaded" mode for the duration of the print.
Lazy-tree unloaded children are NOT auto-loaded — the printout reflects
on-screen state.

---

## 4. Public API surface

### 4.1 `DataGrid` props (additions)

```ts
interface DataGridProps<TRow> {
  /* ...existing... */

  /** Visual density. Default: 'standard'. */
  density?: 'compact' | 'standard' | 'comfortable';

  /** Row striping. Default: false. */
  striped?: boolean;

  /** Theme name OR composed theme className. Adds 'auto'. */
  theme?:
    | 'light' | 'dark'
    | 'high-contrast-light' | 'high-contrast-dark'
    | 'auto'
    | string;

  /** Enable CSS transitions on theme/density changes. Default: false. */
  transitions?: boolean;

  /** Per-icon overrides. */
  icons?: Partial<Record<StrataIconName, ComponentType<StrataIconProps>>>;
}
```

### 4.2 New exports

```ts
// from 'strata-grid'
export { StrataIcon, type StrataIconName, type StrataIconProps };
export { createTheme, type ThemeOverrides, type ComposedTheme };
```

---

## 5. Migration & backward compatibility

- **No breaking changes.** All new props default to current behavior:
  `density='standard'` matches today's row height (36px), `striped=false`,
  `theme='light'`, `transitions=false`.
- **Existing token names preserved.** New tokens are additive.
- **Icon migration is internal.** Components that currently render `▾` / `▸`
  / sort arrows etc. switch to `<StrataIcon>` — but the visual result and the
  surrounding `aria-label`s remain the same.
- **Composed themes are opt-in.** The current `theme="light"|"dark"` string
  union continues to work.

---

## 6. Performance & bundle budget

- **Bundle target:** the M5 additions (icon registry + 22 Lucide imports +
  `createTheme` + `useColorScheme` hook) must stay under +8KB gzipped on top
  of the M4 baseline.
- **Density change cost:** triggers a single virtualizer remeasure (one
  `requestAnimationFrame` worth of work).
- **Theme change cost:** zero render churn — only CSS custom property values
  change. Strings flow through unchanged.
- **Striping cost:** pure CSS (`:nth-child(even)`), no JS.
- **Lucide:** ~280 bytes gzipped per icon when tree-shaken; 22 icons ≈ 6KB.

---

## 7. Testing strategy

- **Token tests:** snapshot the computed styles at each density and theme
  preset, asserting key tokens resolve to expected values.
- **Icon coverage test:** assert that every `StrataIconName` has a default
  Lucide mapping AND that the override path works (test renders an icon with
  a custom component).
- **A11y test:** Axe assertions on each preset (`light`, `dark`, both
  high-contrast variants) confirming WCAG AA / AAA contrast.
- **`createTheme` test:** invoke, assert injected style tag exists, dispose,
  assert tag removed.
- **`prefers-color-scheme` test:** mock `matchMedia`, switch preference,
  assert applied theme switches.
- **Print stylesheet test:** trigger `window.matchMedia('print').matches`,
  assert virtualization is bypassed (all rows present in DOM).

---

## 8. Acceptance criteria

1. All ad hoc text glyphs in M1–M4 components are replaced with `<StrataIcon>`.
2. All four built-in themes (`light`, `dark`, `high-contrast-light`,
   `high-contrast-dark`) pass WCAG AA contrast for text, AAA for the two
   high-contrast variants.
3. Switching `density` between renders updates row height with no layout
   thrash beyond a single virtualizer remeasure.
4. `createTheme` injects scoped styles that do not bleed across grid instances.
5. `theme="auto"` flips between `light` and `dark` in response to OS preference
   changes within 100ms.
6. Adding M5 features does not regress any of the 615 existing M1–M4 tests.
7. New M5 features have unit and visual-regression coverage.
8. Bundle increase ≤ 8KB gzipped over the M4 baseline.

---

## 9. Risks & open questions

- **Lucide as peer dependency vs. dependency.** Peer is cleaner for bundle
  size (consumers who use Lucide elsewhere dedupe naturally) but more friction
  at install. Plan 1 starts with a regular dependency; revisit if bundle
  impact exceeds budget.
- **`createTheme` SSR.** Injecting a style tag at runtime is client-only.
  SSR consumers would receive a flash of unstyled content until hydration.
  Acceptable for M5 — full SSR theming is an M8 docs-site concern.
- **Density vs. virtualization edge case.** If a consumer changes density
  mid-scroll, the virtualizer's scroll position may need adjusting to
  preserve the visually-anchored row. Plan 3 covers a "preserve anchor row"
  mechanism.
- **Print of large lazy trees.** A 100K-row lazy tree where 200 nodes are
  expanded prints 200 rows; this is intentional but may confuse users who
  expect "print everything." Plan 8 includes a console warning when the
  printed set is significantly smaller than the total.

---

## 10. Implementation plan structure

| Plan | Title | Scope |
|---|---|---|
| **Plan 1** | Icon system foundation | `StrataIcon`, `StrataIconName` registry, Lucide integration, icon theme tokens, accessibility contract |
| **Plan 2** | Icon coverage rollout | Replace every `▾`/`▸`/text glyph in M1–M4 components with `StrataIcon`; preserve all existing `aria-label`s |
| **Plan 3** | Density & row striping | `density` and `striped` props, density tokens, virtualizer remeasure hook |
| **Plan 4** | High-contrast theme presets | `high-contrast-light` and `high-contrast-dark` token sets; WCAG AAA contrast validation |
| **Plan 5** | Runtime theme composition | `createTheme`, scoped style injection, dispose lifecycle, TypeScript types |
| **Plan 6** | `prefers-color-scheme` & transitions | `theme="auto"`, `useColorScheme` hook, `transitions` prop with reduced-motion respect |
| **Plan 7** | Scrollbar styling | Themed native scrollbars (WebKit + Firefox), density-aware sizing |
| **Plan 8** | Print stylesheet | `@media print` rules, virtualizer print-mode hook, large-tree warning |
