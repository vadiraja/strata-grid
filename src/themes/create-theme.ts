import type { GridTheme } from '../model/types';

/** A valid Strata CSS custom property name. */
export type StrataTokenName = `--strata-${string}`;

/** Token overrides to apply on top of a base theme. */
export interface ThemeOverrides {
  tokens: Partial<Record<StrataTokenName, string>>;
}

/** The object returned by `createTheme` containing a className and dispose function. */
export interface ComposedTheme {
  /** CSS class name to pass to DataGridProps.theme */
  className: string;
  /** Removes the injected style tag. Idempotent. */
  dispose: () => void;
}

let counter = 0;

/**
 * Composes a runtime theme by injecting a scoped `<style>` tag with token overrides.
 *
 * @param base - The base theme literal (used for documentation/intent; CSS cascade handles inheritance)
 * @param overrides - Token overrides to apply
 * @returns A `ComposedTheme` with a unique `className` and an idempotent `dispose` function
 */
export function createTheme(base: GridTheme, overrides: ThemeOverrides): ComposedTheme {
  const uid = `strata-theme-${++counter}-${Date.now().toString(36)}`;
  const className = uid;

  // Build CSS rule string from token entries
  const tokenRules = Object.entries(overrides.tokens)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  const css = `.${className} {\n${tokenRules}\n}`;

  // SSR safety: skip injection if document is not available
  const canInject = typeof document !== 'undefined';

  if (canInject) {
    const style = document.createElement('style');
    style.id = uid;
    style.textContent = css;
    document.head.appendChild(style);
  }

  let disposed = false;

  return {
    className,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (canInject) {
        const el = document.getElementById(uid);
        if (el) el.remove();
      }
    },
  };
}
