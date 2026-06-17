import { useInfiniteQuery } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

import { usePostrun } from './context';

/**
 * The offset-pagination envelope every Postrun list endpoint returns. The helper
 * only needs these fields; the concrete page type comes from the SDK response
 * (e.g. `PostList`), which satisfies this structurally — nothing is redeclared.
 */
interface PageEnvelope<TItem> {
  data: TItem[];
  total: number;
  offset: number;
  has_more: boolean;
}

/** A flattened, append-style ("load more") view over a paginated list endpoint. */
export interface InfiniteList<TItem> {
  /** Every item loaded so far, flattened across all fetched pages. */
  items: TItem[];
  /** Total items matching the filter (from the first page's envelope). */
  total: number;
  /** Fetch the next page and append it. No-op once `hasMore` is false. */
  loadMore: () => void;
  /** Whether another page exists beyond what's loaded. */
  hasMore: boolean;
  /** The first page is loading (no items yet). */
  isLoading: boolean;
  /** A `loadMore()` is in flight (items are already shown). */
  isLoadingMore: boolean;
  /** The last error, or null. Narrow with `instanceof PostrunError`. */
  error: Error | null;
  /** Refetch from the first page (re-runs every loaded page). */
  refetch: () => void;
}

/**
 * Turn an offset-paginated Postrun list endpoint into a clean append-style
 * `{ items, loadMore, hasMore, … }` surface — the "Load more" / infinite-scroll
 * shape a feed or calendar wants.
 *
 * Built on TanStack `useInfiniteQuery`, so page accumulation is its job and never
 * hand-rolled. The next offset is read from the envelope itself
 * (`offset + data.length`), so it stays correct regardless of page size.
 * `fetchPage` supplies the resource-specific SDK call; the page type is inferred
 * from its return, so item types are derived, never redeclared.
 */
export function useInfiniteList<TItem>(args: {
  queryKey: QueryKey;
  fetchPage: (page: {
    limit: number;
    offset: number;
  }) => Promise<PageEnvelope<TItem>>;
  /** Items per page (default 20, the API's own default). */
  limit?: number;
  enabled?: boolean;
}): InfiniteList<TItem> {
  const { queryClient } = usePostrun();
  const limit = args.limit ?? 20;

  const query = useInfiniteQuery(
    {
      queryKey: args.queryKey,
      queryFn: ({ pageParam }) => args.fetchPage({ limit, offset: pageParam }),
      initialPageParam: 0,
      getNextPageParam: (last) =>
        last.has_more ? last.offset + last.data.length : undefined,
      enabled: args.enabled,
    },
    queryClient,
  );

  return {
    items: query.data?.pages.flatMap((page) => page.data) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
    loadMore: () => {
      void query.fetchNextPage();
    },
    hasMore: query.hasNextPage,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
