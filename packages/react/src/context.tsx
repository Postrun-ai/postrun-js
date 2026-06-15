import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

import { QueryClient } from '@tanstack/react-query';

import { createPostrunClient } from '@postrun/js';
import type { PostrunClient } from '@postrun/js';

/**
 * The value every hook and component reads from context: the typed SDK client
 * plus a private TanStack `QueryClient` that powers caching, dedup, and
 * revalidation. Hooks pass this `queryClient` explicitly to `useQuery` /
 * `useMutation`, so it stays fully isolated from any QueryClient the host app
 * runs of its own — no `QueryClientProvider` setup required from the customer.
 */
export interface PostrunContextValue {
  client: PostrunClient;
  queryClient: QueryClient;
}

/** Sensible defaults: treat data as fresh briefly to avoid refetch storms. */
function createDefaultQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000 },
    },
  });
}

const PostrunContext = createContext<PostrunContextValue | null>(null);
PostrunContext.displayName = 'PostrunContext';

export interface PostrunProviderProps {
  /**
   * Returns a valid short-lived scoped token. The host app's backend mints it
   * from a secret `pr_` key (`POST /v1/tokens`); the secret never reaches the
   * browser. Called per request — cache and refresh before `exp` inside here.
   */
  getToken: () => string | Promise<string>;
  /** Override the API base URL (defaults to the production gateway). */
  baseUrl?: string;
  /**
   * Bring your own TanStack `QueryClient` (advanced: shared DevTools, custom
   * defaults, tests). Omit it and a private, isolated one is created for you.
   */
  queryClient?: QueryClient;
  children: ReactNode;
}

export function PostrunProvider({
  getToken,
  baseUrl,
  queryClient,
  children,
}: PostrunProviderProps) {
  // Keep the latest `getToken` in a ref so the client can always call the
  // freshest closure WITHOUT being rebuilt when callers pass a new arrow each
  // render (the common case). The client is constructed once per `baseUrl`.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const client = useMemo(
    () =>
      createPostrunClient({ getToken: () => getTokenRef.current(), baseUrl }),
    [baseUrl],
  );

  const resolvedQueryClient = useMemo(
    () => queryClient ?? createDefaultQueryClient(),
    [queryClient],
  );

  const value = useMemo<PostrunContextValue>(
    () => ({ client, queryClient: resolvedQueryClient }),
    [client, resolvedQueryClient],
  );

  return createElement(PostrunContext.Provider, { value }, children);
}

/** Access the configured Postrun client. Throws if used outside a provider. */
export function usePostrun(): PostrunContextValue {
  const value = useContext(PostrunContext);

  if (value === null) {
    throw new Error('usePostrun must be used within a <PostrunProvider>.');
  }

  return value;
}
