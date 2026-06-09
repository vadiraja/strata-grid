# Configurable Grid Appearance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `appearance` prop to `DataGrid` that configures gridlines, row height, border width, and border colors, and ship an airier default (horizontal-only gridlines, 36px standard rows).

**Architecture:** A new `GridAppearance` type is surfaced on `DataGrid`/`GridRoot`. `gridLines` maps to a `data-strata-gridlines` attribute toggled by CSS rules; `rowHeight`/`borderWidth`/colors map to inline CSS custom properties on the root. `rowHeight` (and density) are threaded into the row virtualizer through `BodyViewport` so virtual measurement matches the rendered CSS height. Defaults change to horizontal gridlines and a 36px standard row.

**Tech Stack:** React + TypeScript, TanStack Virtual, Vitest + @testing-library/react, CSS custom properties.

---

## File Structure

- `src/model/types.ts` — add `GridLines` + `GridAppearance` types (near `Density`).
- `src/index.ts` — export the two new types.
- `src/theme/tokens.css` — bump default `--strata-row-height` / `--strata-cell-padding-y`.
- `src/theme/density.css` — bump the `standard` density block.
- `src/virtual/use-row-virtualizer.ts` — `rowHeight` override + remeasure on change; bump standard constant.
- `src/components/BodyViewport.tsx` — accept `density` + `rowHeight`, pass to virtualizer.
- `src/components/GridRoot.tsx` — `appearance` prop → `data-strata-gridlines` + inline CSS vars; thread to `BodyViewport`.
- `src/components/DataGrid.tsx` — `appearance` prop, forward to `GridRoot`.
- `src/strata.css` — `data-strata-gridlines` CSS rules.
- Tests: `src/theme/density.test.ts`, `src/virtual/use-row-virtualizer.density.test.ts`, new `src/components/DataGrid.appearance.test.tsx`.
- Docs: `docs-site/src/content/docs/guides/theming.mdx`, a playground example, `CHANGELOG.md`.

---

## Task 1: Add `GridLines` and `GridAppearance` types

**Files:**
- Modify: `src/model/types.ts:248-249`
- Modify: `src/index.ts:18-19`

- [ ] **Step 1: Add the types after the `Density` definition**

In `src/model/types.ts`, immediately after the `Density` type (line 249), add:

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

- [ ] **Step 2: Export the types from the package entry**

In `src/index.ts`, inside the `export type { ... } from './model/types'` block that currently lists `Density` (line 19), add `GridLines,` and `GridAppearance,` on their own lines next to `Density,`:

```ts
  GridTheme,
  Density,
  GridLines,
  GridAppearance,
```

- [ ] **Step 3: Verify it type-checks**

Run: `npm run typecheck`
Expected: PASS (no usages yet; types compile).

- [ ] **Step 4: Commit**

```bash
git add src/model/types.ts src/index.ts
git commit -m "feat(appearance): add GridLines and GridAppearance public types"
```

---

## Task 2: Bump standard density default to 36px (airier rows)

**Files:**
- Modify: `src/theme/tokens.css:51,68`
- Modify: `src/theme/density.css:11-15`
- Test: `src/theme/density.test.ts:62-72`

- [ ] **Step 1: Update the density test expectations to the new standard values**

In `src/theme/density.test.ts`, change the `standard density` block (lines 62-72) to:

```ts
    it('sets --strata-row-height to 36px', () => {
      expect(tokens['--strata-row-height']).toBe('36px');
    });

    it('sets --strata-cell-padding-y to 8px', () => {
      expect(tokens['--strata-cell-padding-y']).toBe('8px');
    });

    it('sets --strata-cell-padding-x to 10px', () => {
      expect(tokens['--strata-cell-padding-x']).toBe('10px');
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/theme/density.test.ts`
Expected: FAIL — standard row-height/padding still read `32px`/`6px`.

- [ ] **Step 3: Update `density.css` standard block**

In `src/theme/density.css`, change the `standard` block (lines 11-15) to:

```css
.strata-grid[data-strata-density="standard"] {
  --strata-row-height: 36px;
  --strata-cell-padding-y: 8px;
  --strata-cell-padding-x: 10px;
}
```

- [ ] **Step 4: Update the base tokens to match**

In `src/theme/tokens.css`, change line 51 from `--strata-cell-padding-y: 6px;` to `--strata-cell-padding-y: 8px;` and line 68 from `--strata-row-height: 32px;` to `--strata-row-height: 36px;`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/theme/density.test.ts`
Expected: PASS (including the ordering-invariant tests: 24 < 36 < 44, 2 < 8 < 10).

- [ ] **Step 6: Commit**

```bash
git add src/theme/density.css src/theme/tokens.css src/theme/density.test.ts
git commit -m "feat(appearance): airier default — standard density 36px rows"
```

---

## Task 3: Virtualizer `rowHeight` override + remeasure

**Files:**
- Modify: `src/virtual/use-row-virtualizer.ts:10-18,20-29,55-81`
- Modify: `src/model/constants.ts:8`
- Test: `src/virtual/use-row-virtualizer.density.test.ts:83-97` (and new cases)

- [ ] **Step 1: Update the existing regression test for the new standard height and add override cases**

In `src/virtual/use-row-virtualizer.density.test.ts`, change the `estimateSize matches density` test (lines 83-97) so the standard case expects `36`:

```ts
  it('estimateSize matches density: compact=24, standard=36, comfortable=44 (regression for #9)', () => {
    const cases: Array<[Density, number]> = [
      ['compact', 24],
      ['standard', 36],
      ['comfortable', 44],
    ];
    for (const [density, expected] of cases) {
      capturedOptions.estimateSize = undefined;
      renderHook(() =>
        useRowVirtualizer({ scrollRef, count: 10, density }),
      );
      expect(capturedOptions.estimateSize).toBeDefined();
      expect(capturedOptions.estimateSize!(0)).toBe(expected);
    }
  });
```

Then add two new tests at the end of the `describe` block (before its closing `});`):

```ts
  it('rowHeight override takes precedence over density', () => {
    capturedOptions.estimateSize = undefined;
    renderHook(() =>
      useRowVirtualizer({ scrollRef, count: 10, density: 'standard', rowHeight: 60 }),
    );
    expect(capturedOptions.estimateSize!(0)).toBe(60);
  });

  it('calls measure() when rowHeight override changes', () => {
    const { rerender } = renderHook(
      ({ rowHeight }: { rowHeight: number }) =>
        useRowVirtualizer({ scrollRef, count: 100, density: 'standard', rowHeight }),
      { initialProps: { rowHeight: 36 } },
    );

    rerender({ rowHeight: 50 });

    expect(mockMeasure).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/virtual/use-row-virtualizer.density.test.ts`
Expected: FAIL — standard expects 36 (still 32), `rowHeight` option not honored, no remeasure on rowHeight change.

- [ ] **Step 3: Bump the standard constants in the virtualizer**

In `src/virtual/use-row-virtualizer.ts`, change `DENSITY_ROW_HEIGHT.standard` (line 12) from `32` to `36`:

```ts
const DENSITY_ROW_HEIGHT: Record<Density, number> = {
  compact: 24,
  standard: 36,
  comfortable: 44,
};
```

And in `src/model/constants.ts` line 8, change the fallback `ROW_HEIGHT` from `32` to `36` so a missing density matches the standard default:

```ts
export const ROW_HEIGHT = 36;
```

- [ ] **Step 4: Add the `rowHeight` option and thread it through `resolveRowHeight`**

In `src/virtual/use-row-virtualizer.ts`, replace `resolveRowHeight` (lines 16-18):

```ts
function resolveRowHeight(
  density: Density | undefined,
  rowHeight: number | undefined,
): number {
  if (rowHeight != null) return rowHeight;
  return density ? DENSITY_ROW_HEIGHT[density] : ROW_HEIGHT;
}
```

Add the option to `UseRowVirtualizerOptions` (after `density?` on line 26):

```ts
  /** Explicit row height in px. Overrides the density preset. */
  rowHeight?: number;
```

Update the destructure (line 55) and the `resolveRowHeight` call (line 56):

```ts
  const { scrollRef, count, density, rowHeight: rowHeightOverride, printing = false } = options;
  const rowHeight = resolveRowHeight(density, rowHeightOverride);
```

- [ ] **Step 5: Extend the remeasure effect to also watch the override**

In `src/virtual/use-row-virtualizer.ts`, replace the density-change effect (lines 65-81) so it tracks both density and the override:

```ts
  // Track previous density + rowHeight to detect changes (skip initial render)
  const prevDensityRef = useRef(density);
  const prevRowHeightRef = useRef(rowHeightOverride);

  useEffect(() => {
    if (
      prevDensityRef.current === density &&
      prevRowHeightRef.current === rowHeightOverride
    )
      return;
    prevDensityRef.current = density;
    prevRowHeightRef.current = rowHeightOverride;

    // Capture the topmost visible row index before remeasure
    const virtualItems = virtualizer.getVirtualItems();
    const anchorIndex = virtualItems.length > 0 ? virtualItems[0].index : 0;

    // Invalidate all cached measurements
    virtualizer.measure();

    // Restore scroll position to the anchor row
    virtualizer.scrollToIndex(anchorIndex, { align: 'start' });
  }, [density, rowHeightOverride, virtualizer]);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/virtual/use-row-virtualizer.density.test.ts`
Expected: PASS (all cases, including the new override + remeasure tests).

- [ ] **Step 7: Run the sibling virtualizer tests to confirm no regression**

Run: `npx vitest run src/virtual/`
Expected: PASS (print + other virtualizer tests unaffected).

- [ ] **Step 8: Commit**

```bash
git add src/virtual/use-row-virtualizer.ts src/model/constants.ts src/virtual/use-row-virtualizer.density.test.ts
git commit -m "feat(appearance): virtualizer rowHeight override with remeasure"
```

---

## Task 4: Thread `density` + `rowHeight` through `BodyViewport`

**Files:**
- Modify: `src/components/BodyViewport.tsx:18-63,66-92`
- Modify: `src/components/GridRoot.tsx:828-858`

> No new test here — behavior is covered end-to-end by the virtualizer tests (Task 3) and the appearance render test (Task 6). This task only wires existing props through.

- [ ] **Step 1: Add `density` + `rowHeight` to `BodyViewportProps`**

In `src/components/BodyViewport.tsx`, add an import for `Density` to the existing type import and add two props to `BodyViewportProps` (after `treeColumnId?` on line 24):

```ts
  /** Visual density — drives virtual row measurement. */
  density?: import('../model/types').Density;
  /** Explicit row height in px. Overrides the density preset. */
  rowHeight?: number;
```

- [ ] **Step 2: Destructure and pass them to the virtualizer**

In `src/components/BodyViewport.tsx`, add `density,` and `rowHeight,` to the destructured params (after `treeColumnId,` on line 69), then update the virtualizer call (line 92):

```ts
  const rowVirtualizer = useRowVirtualizer({
    scrollRef,
    count: rows.length,
    density,
    rowHeight,
    printing,
  });
```

- [ ] **Step 3: Pass `density` + `rowHeight` from `GridRoot`**

In `src/components/GridRoot.tsx`, add two props to the `<BodyViewport>` element (after `treeColumnId={treeColumnId}` on line 831):

```tsx
        density={density}
        rowHeight={appearance?.rowHeight}
```

> `appearance` is added to `GridRoot`'s props in Task 5; if executing strictly in order, this line references it before it exists. Do Task 5 Step 1–2 (add the `appearance` prop + destructure) before running typecheck for this task. The commit below is combined with Task 5.

- [ ] **Step 4: Defer commit**

No commit yet — combined with Task 5 (the `appearance` prop must exist for this to type-check).

---

## Task 5: Wire `appearance` into `GridRoot` and forward from `DataGrid`

**Files:**
- Modify: `src/components/GridRoot.tsx:16,60-67,104-124,796-810`
- Modify: `src/components/DataGrid.tsx:20,133-137,353,1033-1042`

- [ ] **Step 1: Add `appearance` to `GridRootProps` and import the type**

In `src/components/GridRoot.tsx`, add `GridAppearance` to the existing `Density,` type import (line 16 area). Then add to `GridRootProps` after the `density?` prop (line 63):

```ts
  /** Appearance overrides (gridlines, row height, border colors/width). */
  appearance?: GridAppearance;
```

- [ ] **Step 2: Destructure `appearance` in the component signature**

In `src/components/GridRoot.tsx`, add `appearance,` to the destructured params after `density,` (line 110).

- [ ] **Step 3: Build the inline appearance style above the return**

In `src/components/GridRoot.tsx`, just before the `return (` on line 796, add:

```ts
  const appearanceStyle: React.CSSProperties = {
    ...(appearance?.rowHeight != null && {
      '--strata-row-height': `${appearance.rowHeight}px`,
    }),
    ...(appearance?.borderWidth != null && {
      '--strata-border-width': `${appearance.borderWidth}px`,
    }),
    ...(appearance?.borderColor && { '--strata-border': appearance.borderColor }),
    ...(appearance?.cellBorderColor && {
      '--strata-border-cell': appearance.cellBorderColor,
    }),
    ...(appearance?.verticalBorderColor && {
      '--strata-border-cell-vertical': appearance.verticalBorderColor,
    }),
  } as React.CSSProperties;
```

- [ ] **Step 4: Apply the attribute + style on the root `<div>`**

In `src/components/GridRoot.tsx`, on the root `<div>` (lines 797-810), add after `data-strata-transitions=...` (line 809):

```tsx
      data-strata-gridlines={appearance?.gridLines ?? 'horizontal'}
      style={appearanceStyle}
```

> If the root `<div>` already has a `style` prop elsewhere, merge into `appearanceStyle` instead of adding a second `style` attribute. (At lines 797-817 today it has none.)

- [ ] **Step 5: Add `appearance` to `DataGridProps` and import the type**

In `src/components/DataGrid.tsx`, add `GridAppearance` to the existing `Density,` type import (line 20 area). Then add to `DataGridProps` after the `density?` prop (line 134):

```ts
  /** Appearance overrides (gridlines, row height, border colors/width). */
  appearance?: GridAppearance;
```

- [ ] **Step 6: Destructure and forward `appearance` to `GridRoot`**

In `src/components/DataGrid.tsx`, add `appearance,` to the destructured params after `density,` (line 353). Then in the `<GridRoot>` element, add after `density={density}` (line 1040):

```tsx
      appearance={appearance}
```

- [ ] **Step 7: Verify type-check passes (covers Task 4 + Task 5)**

Run: `npm run typecheck`
Expected: PASS — `appearance` flows `DataGrid → GridRoot → BodyViewport`.

- [ ] **Step 8: Commit (Task 4 + Task 5 together)**

```bash
git add src/components/BodyViewport.tsx src/components/GridRoot.tsx src/components/DataGrid.tsx
git commit -m "feat(appearance): wire appearance prop through DataGrid, GridRoot, BodyViewport"
```

---

## Task 6: Gridlines CSS rules + appearance render test

**Files:**
- Modify: `src/strata.css` (after the `.strata-cell` rule, ~line 661)
- Test: Create `src/components/DataGrid.appearance.test.tsx`

- [ ] **Step 1: Write the failing render test**

Create `src/components/DataGrid.appearance.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { DataGrid } from './DataGrid';
import type { ColumnDef } from '../model/types';

interface Row {
  id: string;
  name: string;
  value: number;
}

const data: Row[] = [
  { id: '1', name: 'Alpha', value: 10 },
  { id: '2', name: 'Beta', value: 20 },
];

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'value', header: 'Value', accessor: 'value' },
];

describe('DataGrid — appearance prop', () => {
  it('defaults gridLines to horizontal when appearance is omitted', () => {
    const { container } = render(<DataGrid data={data} columns={columns} />);
    expect(container.querySelector('.strata-grid')).toHaveAttribute(
      'data-strata-gridlines',
      'horizontal',
    );
  });

  it('reflects gridLines in the data-strata-gridlines attribute', () => {
    const { container } = render(
      <DataGrid data={data} columns={columns} appearance={{ gridLines: 'none' }} />,
    );
    expect(container.querySelector('.strata-grid')).toHaveAttribute(
      'data-strata-gridlines',
      'none',
    );
  });

  it('emits CSS custom properties only for provided appearance fields', () => {
    const { container } = render(
      <DataGrid
        data={data}
        columns={columns}
        appearance={{ rowHeight: 48, borderColor: '#abcdef' }}
      />,
    );
    const grid = container.querySelector('.strata-grid') as HTMLElement;
    expect(grid.style.getPropertyValue('--strata-row-height')).toBe('48px');
    expect(grid.style.getPropertyValue('--strata-border')).toBe('#abcdef');
    // Unset fields must not be emitted
    expect(grid.style.getPropertyValue('--strata-border-cell')).toBe('');
    expect(grid.style.getPropertyValue('--strata-border-width')).toBe('');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/DataGrid.appearance.test.tsx`
Expected: FAIL on the first assertion only if Tasks 4–5 are not done. If Tasks 4–5 are done, the attribute/style assertions pass; this task's CSS rules are verified separately in Step 4. (If all three pass already, that's fine — proceed to add the CSS for correctness.)

- [ ] **Step 3: Add the gridlines CSS rules**

In `src/strata.css`, immediately after the `.strata-cell { ... }` rule (closing brace at line 661), add:

```css
/* Gridline modes — toggle which cell/header borders are drawn (issue: configurable appearance) */
.strata-grid[data-strata-gridlines="horizontal"] .strata-cell,
.strata-grid[data-strata-gridlines="horizontal"] .strata-header-cell {
  border-right: none;
}

.strata-grid[data-strata-gridlines="vertical"] .strata-cell,
.strata-grid[data-strata-gridlines="vertical"] .strata-header-cell {
  border-bottom: none;
}

.strata-grid[data-strata-gridlines="none"] .strata-cell,
.strata-grid[data-strata-gridlines="none"] .strata-header-cell {
  border-right: none;
  border-bottom: none;
}
```

> `both` needs no rule — base `.strata-cell` / `.strata-header-cell` already draw both borders. Frozen-column edges (`--strata-border-frozen`) and the header's outer bottom border are intentionally not governed by `gridLines`.

- [ ] **Step 4: Verify the header cell class name matches the selector**

Run: `grep -n "strata-header-cell" src/strata.css`
Expected: the class exists (header cells use `.strata-header-cell`). If the header cell class differs, update the selectors in Step 3 to match the actual class.

- [ ] **Step 5: Run the appearance test to verify it passes**

Run: `npx vitest run src/components/DataGrid.appearance.test.tsx`
Expected: PASS (all three tests).

- [ ] **Step 6: Commit**

```bash
git add src/strata.css src/components/DataGrid.appearance.test.tsx
git commit -m "feat(appearance): gridlines CSS modes + appearance render tests"
```

---

## Task 7: Documentation, playground example, changelog

**Files:**
- Modify: `docs-site/src/content/docs/guides/theming.mdx`
- Modify: a playground example file (locate in Step 3)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add an "Appearance" section to the theming guide**

In `docs-site/src/content/docs/guides/theming.mdx`, append a new section. Use the project's general (non-PLM/BOM) terminology:

```mdx
## Appearance

The `appearance` prop fine-tunes gridlines, row height, and border styling on top of
the active theme and density.

```tsx
<DataGrid
  data={rows}
  columns={columns}
  appearance={{
    gridLines: 'horizontal', // 'both' | 'horizontal' | 'vertical' | 'none' — default 'horizontal'
    rowHeight: 44,           // px — overrides the density preset
    borderWidth: 1,          // px
    borderColor: '#d1d1d6',
    cellBorderColor: '#e5e5e7',
    verticalBorderColor: '#eef0f3',
  }}
/>
```

| Field | Default | CSS variable |
| --- | --- | --- |
| `gridLines` | `'horizontal'` | `data-strata-gridlines` attribute |
| `rowHeight` | density preset | `--strata-row-height` |
| `borderWidth` | `1px` | `--strata-border-width` |
| `borderColor` | `#d1d1d6` | `--strata-border` |
| `cellBorderColor` | `#e5e5e7` | `--strata-border-cell` |
| `verticalBorderColor` | `#eef0f3` | `--strata-border-cell-vertical` |

Each field is independent — set only the ones you need. To restore the pre-0.6 look
(full gridlines, 32px standard rows), use `appearance={{ gridLines: 'both', rowHeight: 32 }}`.
```

- [ ] **Step 2: Verify the docs site builds**

Run: `npm run build --prefix docs-site` (or the repo's documented docs build command — check `docs-site/package.json` scripts if this fails)
Expected: PASS (MDX compiles).

- [ ] **Step 3: Locate and update a playground example**

Run: `grep -rln "appearance\|density=\|<DataGrid" playground src/playground 2>/dev/null | head`
Then add an `appearance={{ gridLines: 'horizontal', rowHeight: 44 }}` prop to one representative example so the airier look is demonstrated. If no playground exists, skip this step and note it in the commit message.

- [ ] **Step 4: Add a changelog entry**

In `CHANGELOG.md`, add an entry under a new unreleased/next-version heading:

```md
### Added
- `appearance` prop on `DataGrid` for configurable gridlines, row height, border width, and border colors.

### Changed
- **Visual default change:** gridlines now default to horizontal-only (was full grid) and standard density rows are 36px (was 32px). Restore the previous look with `appearance={{ gridLines: 'both', rowHeight: 32 }}`.
```

- [ ] **Step 5: Commit**

```bash
git add docs-site/src/content/docs/guides/theming.mdx CHANGELOG.md
git commit -m "docs(appearance): document appearance prop and default change"
```

---

## Task 8: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS (no regressions; updated density/virtualizer/appearance tests green).

- [ ] **Step 2: Type-check and lint**

Run: `npm run typecheck`
Then run: `npm run lint`
Expected: PASS for both.

- [ ] **Step 3: Build the library**

Run: `npm run build`
Expected: PASS — `GridAppearance`/`GridLines` appear in the emitted `.d.ts`.

- [ ] **Step 4: Final review commit (if any fixups were needed)**

```bash
git add -A
git commit -m "chore(appearance): finalize configurable appearance feature"
```
