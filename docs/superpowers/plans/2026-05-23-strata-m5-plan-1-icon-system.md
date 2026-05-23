# Strata — M5 · Plan 1: Icon system foundation

- **Date:** 2026-05-23
- **Depends on:** M1 (token system from Plan 7).
- **Blocks:** M5 Plan 2 (coverage rollout).

## Goal

Establish the `<StrataIcon>` component, the `StrataIconName` registry, and
the token-driven icon styling. No existing component is changed in this plan
— Plan 2 does the rollout.

## Scope

- Add `lucide-react` as a dependency.
- New module `src/icons/`:
  - `icon-registry.ts` — `StrataIconName` union, default Lucide mapping.
  - `StrataIcon.tsx` — the abstraction component.
  - `icon-context.tsx` — React context for consumer overrides (read by
    `<StrataIcon>`, written by `<DataGrid icons={...}>`).
  - `index.ts` — public re-exports.
- New icon tokens in `strata.css`:
  - `--strata-icon-size`, `--strata-icon-stroke`, `--strata-icon-color`,
    `--strata-icon-color-hover`, `--strata-icon-color-disabled`.
- Re-export `StrataIcon`, `StrataIconName`, `StrataIconProps` from
  `src/index.ts`.

## Accessibility contract (tested)

- `label` set → `role="img"` + `aria-label`.
- `label` omitted → `aria-hidden="true"`, caller owns the accessible name.

## Tests

- `src/icons/icon-registry.test.ts` — every `StrataIconName` has a default
  Lucide component registered.
- `src/icons/StrataIcon.test.tsx` —
  - renders default Lucide icon for a name,
  - applies override from context,
  - applies size/className,
  - emits correct ARIA attrs for both labeled and unlabeled cases.

## Acceptance

- `<StrataIcon name="chevron-down" />` renders the Lucide ChevronDown icon.
- Wrapping in `<IconContext.Provider value={{ 'chevron-down': MyIcon }}>`
  swaps the rendered component.
- All new files typecheck and lint clean.
