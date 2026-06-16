import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // react-tweet ships CSS-module imports; inline it so Vite transforms them
    // (Node's ESM loader can't import `.css`). Production builds leave it
    // external, so the consumer's bundler handles the CSS there.
    server: { deps: { inline: ['react-tweet'] } },
  },
});
