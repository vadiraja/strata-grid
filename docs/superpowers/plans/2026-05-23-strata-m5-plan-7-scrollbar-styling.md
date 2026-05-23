# Strata — M5 · Plan 7: Scrollbar styling

- **Date:** 2026-05-23
- **Depends on:** M5 Plan 3 (density tokens).

## Goal

Theme the native scrollbars (vertical scroll on `BodyViewport`, any nested
overflow) to match the surrounding theme and density. The existing custom
*horizontal* scrollbar in `GridRoot.tsx` is already token-driven; this plan
adds matching styling for the *native* scrollbars.

## Scope

CSS-only changes in `strata.css`. No JS, no public API additions.

### WebKit / Blink

```css
.strata-body-viewport::-webkit-scrollbar {
  width: var(--strata-scrollbar-size);
  height: var(--strata-scrollbar-size);
}
.strata-body-viewport::-webkit-scrollbar-track {
  background: var(--strata-scrollbar-track-bg);
}
.strata-body-viewport::-webkit-scrollbar-thumb {
  background: var(--strata-scrollbar-thumb-bg);
  border-radius: var(--strata-scrollbar-radius);
}
.strata-body-viewport::-webkit-scrollbar-thumb:hover {
  background: var(--strata-scrollbar-thumb-hover-bg);
}
```

### Firefox

```css
.strata-body-viewport {
  scrollbar-color: var(--strata-scrollbar-thumb-bg) var(--strata-scrollbar-track-bg);
  scrollbar-width: var(--strata-scrollbar-width);
}
```

### Density bindings

- `compact`: `--strata-scrollbar-size: 8px`, `--strata-scrollbar-width: thin`.
- `standard`: `--strata-scrollbar-size: 12px`, `--strata-scrollbar-width: auto`.
- `comfortable`: `--strata-scrollbar-size: 14px`, `--strata-scrollbar-width: auto`.

## Tests

- Visual regression in the playground.
- Computed-style assertion that the new custom properties resolve at each
  density.

## Acceptance

- Vertical scrollbar visibly themed in all four presets.
- No layout shift when switching density.
