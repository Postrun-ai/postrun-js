import { defineConfig } from 'tsup';

// Two passes. The MAIN build (index/server/schemas) is unchanged from before, so
// its emitted `.d.ts` chunking — and thus the types `@postrun/react`'s existing
// hooks infer across the package boundary — stays stable (avoids TS2742).
//
// The QUERY build is a SEPARATE single-entry pass: its `.d.ts` bundles every type
// it references self-contained, so `@postrun/js/query` is portably nameable from
// react. `@tanstack/react-query` stays external (an optional peer, never bundled).
export default defineConfig([
  {
    entry: ['src/index.ts', 'src/server.ts', 'src/schemas/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
  },
  {
    entry: ['src/query.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: false,
    sourcemap: true,
    treeshake: true,
    external: ['@tanstack/react-query'],
  },
]);
