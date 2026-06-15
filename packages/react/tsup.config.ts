import { readFile, writeFile } from 'node:fs/promises';

import { defineConfig } from 'tsup';

const USE_CLIENT = '"use client";\n';
const OUTPUTS = ['dist/index.js', 'dist/index.cjs'];

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['react', 'react-dom'],
  // The whole package is client-side (context + hooks), so the output must carry
  // a top-level `'use client'` directive to be importable from a React Server
  // Component. esbuild strips module-level directives when bundling and tsup
  // drops the `banner` too, so we prepend it after a successful build.
  async onSuccess() {
    for (const file of OUTPUTS) {
      const code = await readFile(file, 'utf8');
      if (!code.startsWith('"use client"')) {
        await writeFile(file, USE_CLIENT + code);
      }
    }
  },
});
