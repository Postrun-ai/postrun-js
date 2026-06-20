import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Alias the workspace packages to their SOURCE (not built dist) so editing a
// component hot-reloads instantly — no `tsup` rebuild in the live loop.
const srcOf = (rel: string) =>
  fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@postrun/react': srcOf('../../packages/react/src/index.ts'),
      '@postrun/js': srcOf('../../packages/js/src/index.ts'),
      // Deep import for the WIP preview before it's exported from the barrel.
      '@preview': srcOf('../../packages/react/src/preview'),
    },
  },
  server: { port: 5180 },
});
