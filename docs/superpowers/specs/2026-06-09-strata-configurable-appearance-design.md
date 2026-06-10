# Strata — Configurable Grid Appearance (gridlines, row height, borders)

**Date:** 2026-06-09
**Status:** Approved (design)

## Problem

Compared against Syncfusion's grid, Strata's default look reads as cramped:

1. **Full gridlines.** Every body cell draws *both* a horizontal (`border-bottom`,
   `--strata-border-cell` `#e5e5e7`) and a vertical (`border-right`,
   `--strata-border-cell-vertical` `#eef0f3`) line. The faint vertical column lines
   are the main contributor to the "boxed-in" feel. Syncfusion draws horizontal row
   separators only.
2. **Tight rows.** Standard density is `32px` with `6px` vertical padding. Syncfusion's
   default rows are roughly `54–56px`.

Border *width* is the same in both (1px) — the difference is which borders are drawn
and how much vertical breathing room each row has.

Beyond fixing the default, consumers should be able to tune these without editing CSS:
gridline style, row height, border width, and border colors.

## Goals

- Expose grid appearance as a configurable prop so consumers (and the playground) can
  change gridlines, row height, border width, and border colors without touching CSS.
- Ship an airier default that reduces the cramped look out of the box.
- Stay backward compatible at the API level (the prop is optional; omitting it yields
  the new default look).

## Non-goals

- No new theme files or `createTheme` changes — this layers on the existing token system.
- No per-column or per-row border overrides.
- No change to `compact`/`comfortable` density presets (only `standard` default shifts).

## API

New public type in `src/model/types.ts`:

```ts
/** Cell-border rendering style. */
export type GridLines = 'both' | 'horizontal' | 'vertical' | 'none';

/** Visual appearance overrides layered over the active theme + density. */
export interface GridAppearance {
  /** Which cell borders to draw. Default: 'horizontal'. */
  gridLines?: GridLines;
  /** Row height in px. Overrides the density preset. */
  rowHeight?: number;
  /** Border thickness in px. Maps to --strata-border-width. */
  borderWidth?: number;
  /** Outer border + header bottom. Maps to --strata-border. */
  borderColor?: string;
  /** Horizontal row separators. Maps to --strata-border-cell. */
  cellBorderColor?: string;
  /** Vertical column lines. Maps to --strata-border-cell-vertical. */
  verticalBorderColor?: string;
}
```

Surfaced as an optional `appearance?: GridAppearance` prop on both `DataGridProps`
(`src/components/DataGrid.tsx`) and `GridRootProps` (`src/components/GridRoot.tsx`).
`DataGrid` forwards `appearance` straight through to `GridRoot`, mirroring how
`density` is already forwarded.

### Usage

```tsx
<DataGrid
  appearance={{
    gridLines: 'horizontal',
    rowHeight: 44,
    borderColor: '#d1d1d6',
    verticalBorderColor: '#eef0f3',
  }}
/>
```

Omitting `appearance` (or any field) falls back to the new defaults below. Each field
is independent — setting only `rowHeight` leaves gridlines and colors at their defaults.

## New defaults (airier)

| Knob | Old | New |
|---|---|---|
| `gridLines` (default) | `both` (implicit) | **`horizontal`** |
| Standard density row height | `32px` | **`36px`** |
| Standard density `cell-padding-y` | `6px` | **`8px`** |

`compact` (24px) and `comfortable` (44px) presets are unchanged. The row-height change
is applied in three coordinated places that must stay in sync:

- `src/theme/tokens.css` — `--strata-row-height`, `--strata-cell-padding-y`
- `src/theme/density.css` — the `[data-strata-density="standard"]` block
- `src/virtual/use-row-virtualizer.ts` — `DENSITY_ROW_HEIGHT.standard` and the bare
  `ROW_HEIGHT` fallback constant

This is a deliberate **visual breaking change** (approved): existing consumers who do
not pass `appearance` will see horizontal-only gridlines and slightly taller standard
rows. It will be called out in the changelog / release notes.

## Wiring

### Root element (`GridRoot.tsx`)

Add to the root `<div>`, alongside the existing `data-strata-density` /
`data-strata-striped` attributes:

- `data-strata-gridlines={appearance?.gridLines ?? 'horizontal'}`
- An inline `style` object that emits a CSS custom property **only** for each provided
  field, so unset fields continue to inherit from theme/density:

```ts
const appearanceStyle: React.CSSProperties = {
  ...(appearance?.rowHeight != null && { '--strata-row-height': `${appearance.rowHeight}px` }),
  ...(appearance?.borderWidth != null && { '--strata-border-width': `${appearance.borderWidth}px` }),
  ...(appearance?.borderColor && { '--strata-border': appearance.borderColor }),
  ...(appearance?.cellBorderColor && { '--strata-border-cell': appearance.cellBorderColor }),
  ...(appearance?.verticalBorderColor && { '--strata-border-cell-vertical': appearance.verticalBorderColor }),
};
```

If the root already sets an inline `style` (e.g. for `height`), merge rather than
overwrite.

### Virtualizer (`use-row-virtualizer.ts`)

`useRowVirtualizer` gains an optional `rowHeight?: number` option. `resolveRowHeight`
returns `rowHeightOverride ?? DENSITY_ROW_HEIGHT[density] ?? ROW_HEIGHT`. The existing
"density changed → invalidate + remeasure with scroll-anchor preservation" effect is
extended to also fire when the `rowHeight` override changes, so virtual row positions
stay correct. `GridRoot` passes `appearance?.rowHeight` into the hook.

### CSS (`strata.css`)

Add attribute-scoped rules that toggle which borders draw. `.strata-cell` and
`.strata-header-cell` keep their current `border-bottom` / `border-right`; the new
rules remove the ones not wanted for the active mode:

```css
/* horizontal: row separators only */
.strata-grid[data-strata-gridlines="horizontal"] .strata-cell,
.strata-grid[data-strata-gridlines="horizontal"] .strata-header-cell { border-right: none; }

/* vertical: column lines only */
.strata-grid[data-strata-gridlines="vertical"] .strata-cell { border-bottom: none; }
.strata-grid[data-strata-gridlines="vertical"] .strata-header-cell { border-bottom: none; }

/* none: no cell borders */
.strata-grid[data-strata-gridlines="none"] .strata-cell,
.strata-grid[data-strata-gridlines="none"] .strata-header-cell { border-right: none; border-bottom: none; }
```

`both` needs no rule (the base `.strata-cell` / `.strata-header-cell` rules already draw
both). Frozen/pinned column edges (`--strata-border-frozen`) and the header's outer
bottom border are intentionally **not** governed by `gridLines` — they are structural,
not gridlines, and stay visible in all modes.

## Documentation

- `docs-site/src/content/docs/guides/theming.mdx` — add an "Appearance" section
  documenting the `appearance` prop, each field, defaults, and a Syncfusion-style
  example (`gridLines: 'horizontal'`, taller rows).
- API reference (typedoc-generated) picks up `GridAppearance` / `GridLines` automatically
  from the exported types; ensure both are exported from the package entry.
- Add a playground example demonstrating the appearance knobs.
- Note the default visual change in the changelog / release notes.

## Testing

- `src/theme/density.test.ts` — update expected standard row height (32 → 36) and
  padding; add assertion that the standard preset matches the virtualizer constant.
- `src/virtual/use-row-virtualizer.density.test.ts` (or a sibling) — `rowHeight`
  override wins over density; changing the override triggers remeasure; total height
  uses the override.
- New test (component-level) — `appearance.gridLines` sets `data-strata-gridlines`;
  appearance color/width/rowHeight fields emit the matching inline CSS custom properties;
  unset fields emit none.
- Existing snapshot/visual tests that assert the old standard height or full gridlines
  are updated to the new default.

## Risks

- **Virtualizer / CSS drift.** Row height lives in both CSS and JS; the test that asserts
  they match guards against future drift.
- **Visual breaking change.** Mitigated by changelog callout; consumers can restore the
  old look with `appearance={{ gridLines: 'both', rowHeight: 32 }}`.
- **Inline-style merge.** Must merge with any existing root inline style, not replace it.
