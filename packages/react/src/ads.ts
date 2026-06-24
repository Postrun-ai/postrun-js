import { useCallback, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';

import type { UseQueryResult } from '@tanstack/react-query';

import type {
  AdTreeNode,
  GoogleGetAdTreeData,
  GoogleGetAdTreeError,
  GoogleGetAdTreeResponse,
} from '@postrun/js';
import { groupAdTree } from '@postrun/js';
import { googleGetAdTreeOptions } from '@postrun/js/query';

import { usePostrun } from './context';

/**
 * The Google Ads campaign tree for one connection + window. The API returns FLAT
 * nodes lazily — `GET /ads/tree` gives the campaign level; `?campaign_id=` gives
 * that campaign's subtree — so this hook fetches the campaign level plus one query
 * per EXPANDED campaign, then `groupAdTree`s the merged set into the nested tree.
 *
 * Expansion is CONTROLLED: the caller owns which campaigns are open (a `Set`/array
 * of campaign ids) and passes it as `expanded`; the hook reacts by loading exactly
 * those subtrees. Changing `since`/`until`/`metrics` refetches (they're in the
 * query key). Metrics are Google's authoritative per-level numbers — no roll-up.
 */
export type UseAdTreeParams = Pick<
  GoogleGetAdTreeData['query'],
  'since' | 'until' | 'metrics'
> & {
  /** The Google Ads connection id (`conn_…`). */
  connectionId: string;
  /** Campaign ids whose subtree to load (the expanded rows). */
  expanded?: string[];
};

export type UseAdTreeResult = Pick<
  UseQueryResult<GoogleGetAdTreeResponse, GoogleGetAdTreeError>,
  'isLoading' | 'isError' | 'error' | 'refetch'
> & {
  /** The campaign roots, each with its loaded children nested under it. */
  tree: AdTreeNode[];
  /** Whether the subtree for an expanded campaign is still loading. */
  isExpanding: (campaignId: string) => boolean;
};

export function useAdTree(params: UseAdTreeParams): UseAdTreeResult {
  const { connectionId, since, until, metrics, expanded = [] } = params;
  const { client, queryClient } = usePostrun();

  const enabled = Boolean(connectionId && since && until);
  const path = { connection_id: connectionId };
  const baseQuery = { since, until, metrics };

  const campaign = useQuery(
    {
      ...googleGetAdTreeOptions({ client, path, query: baseQuery }),
      enabled,
    },
    queryClient,
  );

  // Stable combine function: produces the merged subtree nodes + a loading map
  // keyed by campaign id. useQueries memoizes the combine output — it only
  // re-runs when a query result changes, so stable references come for free.
  const combine = useCallback(
    (
      results: UseQueryResult<GoogleGetAdTreeResponse, GoogleGetAdTreeError>[],
    ) => {
      const nodes = results.flatMap((q) => q.data?.data ?? []);
      const loadingById = new Map(
        expanded.map((id, i) => [id, results[i]?.isLoading ?? false]),
      );
      return { nodes, loadingById };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expanded is an array; join gives a stable string dep
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional string-join dep for array stability
    [expanded.join(',')],
  );

  const { nodes: subtreeNodes, loadingById } = useQueries(
    {
      queries: expanded.map((campaignId) => ({
        ...googleGetAdTreeOptions({
          client,
          path,
          query: { ...baseQuery, campaign_id: campaignId },
        }),
        enabled,
      })),
      combine,
    },
    queryClient,
  );

  // Stable tree: only recomputed when the actual data changes.
  const tree = useMemo(
    () =>
      groupAdTree([...(campaign.data?.data ?? []), ...subtreeNodes]),
    [campaign.data, subtreeNodes],
  );

  // Stable callbacks — identities are preserved across renders with same deps.
  const isExpanding = useCallback(
    (campaignId: string) => loadingById.get(campaignId) ?? false,
    [loadingById],
  );

  const refetch = useCallback(
    (...args: Parameters<typeof campaign.refetch>) => campaign.refetch(...args),
    [campaign.refetch],
  );

  // Stable result object: same identity when nothing changed.
  return useMemo(
    () => ({
      tree,
      isLoading: campaign.isLoading,
      isError: campaign.isError,
      error: campaign.error,
      isExpanding,
      refetch,
    }),
    [
      tree,
      campaign.isLoading,
      campaign.isError,
      campaign.error,
      isExpanding,
      refetch,
    ],
  );
}
