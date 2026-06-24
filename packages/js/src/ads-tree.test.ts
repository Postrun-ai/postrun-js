import { describe, expect, it } from 'vitest';

import type { GoogleAdTreeNode } from './client/types.gen';
import { groupAdTree } from './ads-tree';

/**
 * `GET /v1/google/{conn}/ads/tree` returns FLAT nodes keyed by `parent_id` (the
 * API does the per-level metrics; the client only assembles the shape). Grouping
 * flat → nested is generic, so it lives in the SDK. These tests pin the contract:
 * roots are nodes whose parent is absent from the set (so a campaign-level page and
 * a per-campaign subtree page both group correctly, and merge into one tree).
 */

function node(partial: Partial<GoogleAdTreeNode> & Pick<GoogleAdTreeNode, 'id' | 'level' | 'parent_id'>): GoogleAdTreeNode {
  return {
    name: partial.id,
    status: 'ENABLED',
    type: partial.level === 'campaign' ? 'SEARCH' : null,
    child_kind: partial.level === 'campaign' ? 'ad_group' : 'none',
    expandable: partial.level === 'campaign',
    metrics: { clicks: 1 },
    cost_micros: 1_000_000,
    cost: 1,
    ...partial,
  };
}

describe('groupAdTree', () => {
  it('returns an empty tree for no nodes', () => {
    expect(groupAdTree([])).toEqual([]);
  });

  it('groups a campaign → ad_group → leaf set into a nested tree', () => {
    const tree = groupAdTree([
      node({ id: 'c1', level: 'campaign', parent_id: null }),
      node({ id: 'g1', level: 'ad_group', parent_id: 'c1' }),
      node({ id: 'g1~k1', level: 'keyword', parent_id: 'g1' }),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe('c1');
    expect(tree[0]?.children.map((n) => n.id)).toEqual(['g1']);
    expect(tree[0]?.children[0]?.children.map((n) => n.id)).toEqual(['g1~k1']);
    // Leaf carries the original node fields untouched.
    expect(tree[0]?.children[0]?.children[0]?.cost).toBe(1);
  });

  it('treats a node whose parent is absent as a root (a subtree page on its own)', () => {
    // A `?campaign_id=` page returns ad_groups (parent = the absent campaign) + leaves.
    const tree = groupAdTree([
      node({ id: 'g1', level: 'ad_group', parent_id: 'c1' }),
      node({ id: 'g1~a1', level: 'ad', parent_id: 'g1' }),
    ]);

    expect(tree.map((n) => n.id)).toEqual(['g1']);
    expect(tree[0]?.children.map((n) => n.id)).toEqual(['g1~a1']);
  });

  it('merges a campaign-level page with a per-campaign subtree page', () => {
    const tree = groupAdTree([
      node({ id: 'c1', level: 'campaign', parent_id: null }),
      node({ id: 'c2', level: 'campaign', parent_id: null }),
      // c1 expanded → its subtree page appended to the flat set.
      node({ id: 'g1', level: 'ad_group', parent_id: 'c1' }),
      node({ id: 'g1~k1', level: 'keyword', parent_id: 'g1' }),
    ]);

    expect(tree.map((n) => n.id)).toEqual(['c1', 'c2']);
    expect(tree[0]?.children.map((n) => n.id)).toEqual(['g1']);
    expect(tree[1]?.children).toEqual([]); // c2 not expanded
  });

  it('preserves input order within each level', () => {
    const tree = groupAdTree([
      node({ id: 'c1', level: 'campaign', parent_id: null }),
      node({ id: 'g_b', level: 'ad_group', parent_id: 'c1' }),
      node({ id: 'g_a', level: 'ad_group', parent_id: 'c1' }),
    ]);

    expect(tree[0]?.children.map((n) => n.id)).toEqual(['g_b', 'g_a']);
  });
});
