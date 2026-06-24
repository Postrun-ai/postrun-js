import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GoogleAdTreeNode } from '@postrun/js';

import { useAdTree } from './ads';
import { testWrapper } from './test-utils';

/**
 * `useAdTree` fetches the campaign level plus one query per expanded campaign and
 * groups the merged flat nodes. The fetch stub answers by URL: a `?campaign_id=`
 * request returns that campaign's subtree, otherwise the campaign level — so the
 * lazy-expand merge is exercised end-to-end through the real client.
 */

function node(
  partial: Partial<GoogleAdTreeNode> &
    Pick<GoogleAdTreeNode, 'id' | 'level' | 'parent_id'>,
): GoogleAdTreeNode {
  return {
    name: partial.id,
    status: 'ENABLED',
    type: partial.level === 'campaign' ? 'SEARCH' : null,
    child_kind: partial.level === 'campaign' ? 'ad_group' : 'none',
    expandable: partial.level === 'campaign',
    metrics: { clicks: 2 },
    cost_micros: 2_000_000,
    cost: 2,
    ...partial,
  };
}

function stubAdTreeFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      const campaignId = new URL(request.url).searchParams.get('campaign_id');
      const data = campaignId
        ? [
            node({ id: 'g1', level: 'ad_group', parent_id: campaignId }),
            node({ id: 'g1~k1', level: 'keyword', parent_id: 'g1' }),
          ]
        : [
            node({ id: 'c1', level: 'campaign', parent_id: null }),
            node({ id: 'c2', level: 'campaign', parent_id: null }),
          ];
      return new Response(JSON.stringify({ object: 'list', data }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('useAdTree', () => {
  const window = { since: '2026-01-01', until: '2026-01-31' };

  it('loads the campaign level as roots (no children until expanded)', async () => {
    stubAdTreeFetch();

    const { result } = renderHook(
      () => useAdTree({ connectionId: 'conn_x', ...window }),
      { wrapper: testWrapper() },
    );

    await waitFor(() =>
      expect(result.current.tree.map((n) => n.id)).toEqual(['c1', 'c2']),
    );
    expect(result.current.tree[0]?.children).toEqual([]);
    expect(result.current.isExpanding('c1')).toBe(false);
  });

  it('nests an expanded campaign’s subtree under it', async () => {
    stubAdTreeFetch();

    const { result } = renderHook(
      () => useAdTree({ connectionId: 'conn_x', ...window, expanded: ['c1'] }),
      { wrapper: testWrapper() },
    );

    await waitFor(() =>
      expect(result.current.tree[0]?.children.map((n) => n.id)).toEqual(['g1']),
    );
    expect(result.current.tree[0]?.children[0]?.children.map((n) => n.id)).toEqual([
      'g1~k1',
    ]);
    // c2 stays collapsed.
    expect(result.current.tree[1]?.children).toEqual([]);
  });

  it('is disabled (no fetch) until a connection + window are provided', () => {
    const calls = stubFetchCounter();

    renderHook(() => useAdTree({ connectionId: '', ...window }), {
      wrapper: testWrapper(),
    });

    expect(calls()).toBe(0);
  });
});

/** A fetch stub that just counts calls (for the disabled-guard test). */
function stubFetchCounter() {
  let count = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      count += 1;
      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return () => count;
}
