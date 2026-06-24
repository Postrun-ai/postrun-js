/**
 * The generated TanStack Query layer — `*Options` (queryKey + queryFn) and
 * `*Mutation` (mutationOptions) for EVERY API operation, emitted by Hey API's
 * `@tanstack/react-query` plugin. Exposed on the `@postrun/js/query` subpath so a
 * non-react consumer of `@postrun/js` never pulls `@tanstack/react-query` (it's an
 * optional peer). `@postrun/react` re-exports these and adds the `usePostrunQuery`
 * sugar that injects the configured client + QueryClient.
 *
 * Each `*Options` takes the same `{ client, path, query, body }` the SDK fns take,
 * so it shares the one client `createPostrunClient` builds — i.e. the
 * `auth: () => getToken()` Bearer flows through automatically.
 */
export * from './client/@tanstack/react-query.gen';
