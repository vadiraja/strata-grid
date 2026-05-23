# Strata — M5 · Plan 5: Runtime theme composition

- **Date:** 2026-05-23
- **Depends on:** M5 Plan 4 (so all four base presets exist before composition).

## Goal

Ship `createTheme(base, overrides)` — composes a branded theme at runtime by
injecting a scoped `<style>` tag with token overrides.

## Scope

- New module `src/themes/create-theme.ts`:
  - `createTheme(base, { tokens }): ComposedTheme` returns `{ className, dispose }`.
  - Injects `<style id="strata-theme-${uid}">` with rules scoped to the
    generated className.
  - `dispose()` removes the style tag and frees the uid.
- `DataGridProps.theme` accepts any `string` (treated as a className applied
  to the grid root) alongside the existing literal union.
- Re-export `createTheme`, `ThemeOverrides`, `ComposedTheme` from
  `src/index.ts`.

## Lifecycle

```ts
useEffect(() => {
  const t = createTheme('dark', { tokens: { 'strata-accent': '#FF6' } });
  setThemeClass(t.className);
  return () => t.dispose();
}, []);
```

`dispose()` is idempotent.

## Tests

- `src/themes/create-theme.test.ts`:
  - assert injected style tag contains expected rules,
  - assert `dispose()` removes the tag,
  - assert two simultaneous composed themes don't collide (unique uids),
  - assert the `className` applies overrides over the base when both render
    in the DOM.

## Acceptance

- Two grids on the same page can use different composed themes without
  cross-contamination.
- Disposing the theme cleans up the DOM.
- TypeScript autocomplete for `tokens` keys covers known tokens (use a
  string-template-literal type for known prefixes).
