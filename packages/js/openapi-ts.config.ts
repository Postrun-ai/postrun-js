import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Hey API codegen. The published OpenAPI spec (`./openapi.json`, synced from the
 * Postrun API) is the single source of truth — types, the resource-style SDK,
 * and Zod validators are all generated from it, so the SDK can never drift.
 *
 * `pnpm generate` refreshes `src/client/**` from the spec. Everything else in
 * this package (client wiring, typed errors, compose helpers) is hand-written on
 * top of the generated layer.
 */
export default defineConfig({
  input: './openapi.json',
  output: {
    path: './src/client',
  },
  postProcess: ['prettier'],
  plugins: [
    '@hey-api/typescript',
    // The fetch client runtime is bundled into the generated output (self-
    // contained, no external runtime dependency).
    '@hey-api/client-fetch',
    // SDK functions are tree-shakeable standalone functions (e.g. postsList,
    // profilesCreate) named from the spec's dot-namespaced operationIds.
    '@hey-api/sdk',
    // Runtime validators generated from the same schemas, exported via
    // `@postrun/js/schemas` for client-side validation before a request.
    'zod',
  ],
});
