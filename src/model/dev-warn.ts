/**
 * Minimal ambient declaration for `process` so the NODE_ENV check type-checks
 * without depending on `@types/node`. A consumer's bundler replaces
 * `process.env.NODE_ENV` with a string literal, so this reference never
 * survives into a production bundle.
 */
declare const process: { env: { NODE_ENV?: string } } | undefined;

/**
 * Emits a development-mode warning, prefixed with `[strata]`.
 *
 * No-op in production builds: a consumer's bundler replaces
 * `process.env.NODE_ENV` with `"production"`, letting the `console.warn`
 * branch be tree-shaken away. Used to flag misconfiguration and messy data
 * (duplicate ids, orphan rows, cycles) without ever crashing the grid.
 */
export function devWarn(message: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return;
  }
  console.warn(`[strata] ${message}`);
}
