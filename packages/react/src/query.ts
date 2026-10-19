import {
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import type { PostrunClient } from '@postrun/js';

import { usePostrun } from './context';

/**
 * The paved FE path over the generated TanStack Query options. Pass a factory
 * that receives the configured client and returns one of the generated `*Options`
 * (e.g. `postsGetAnalyticsOptions`); the provider's client (Bearer via
 * `getToken`) and its isolated `QueryClient` are injected, so auth + caching just
 * work — no global client, no `<QueryClientProvider>` from the host app.
 *
 *   const q = usePostrunQuery((client) =>
 *     postsGetAnalyticsOptions({ client, path: { id: postId } }),
 *   );
 *
 * Equivalent to the raw two-liner — `const { client, queryClient } = usePostrun();
 * useQuery(postsGetAnalyticsOptions({ client, ... }), queryClient)` — which a
 * customer can always write themselves; this is just sugar.
 */
export function usePostrunQuery<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
>(
  optionsFactory: (
    client: PostrunClient,
  ) => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  const { client, queryClient } = usePostrun();

  return useQuery(optionsFactory(client), queryClient);
}

/**
 * The mutation counterpart — pass a factory returning a generated `*Mutation`
 * (e.g. `postsDeleteMutation`); the configured client + `QueryClient` are
 * injected the same way.
 *
 *   const m = usePostrunMutation((client) => postsDeleteMutation({ client }));
 *   m.mutate({ path: { id: postId } });
 */
export function usePostrunMutation<TData, TError, TVariables, TContext>(
  optionsFactory: (
    client: PostrunClient,
  ) => UseMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { client, queryClient } = usePostrun();

  return useMutation(optionsFactory(client), queryClient);
}
