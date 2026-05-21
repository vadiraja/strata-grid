import { defineConfig } from 'tsup';

// tsup automatically externalizes `dependencies` and `peerDependencies`
// (and their subpaths, e.g. `react/jsx-runtime`), so no `external` list
// is needed here.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
});
