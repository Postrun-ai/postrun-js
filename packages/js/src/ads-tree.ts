import type { GoogleAdTreeNode } from './client/types.gen';

/**
 * The Google Ads tree, assembled. `GET /v1/google/{conn}/ads/tree` returns FLAT,
 * native `GoogleAdTreeNode`s with Google's authoritative per-level metrics (no
 * client roll-up) keyed by `parent_id`; turning that into a nested tree is generic,
 * so it lives here rather than in every consumer.
 */

/** A flat tree node with its children attached. Extends the generated node — never
 * a redeclared shape, so it can't drift from the API. */
export interface AdTreeNode extends GoogleAdTreeNode {
  children: AdTreeNode[];
}

/**
 * Group flat tree nodes into a nested tree by `parent_id`. A node whose parent is
 * NOT in the set is a root — so a campaign-level page (campaigns have
 * `parent_id: null`) and a per-campaign subtree page (ad groups whose campaign is
 * absent) each group correctly on their own, and concatenating a campaign page with
 * an expanded campaign's subtree page nests the subtree under that campaign. Input
 * order is preserved within every level. Pure — the input is not mutated.
 */
export function groupAdTree(nodes: GoogleAdTreeNode[]): AdTreeNode[] {
  const byId = new Map<string, AdTreeNode>();

  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] });
  }

  const roots: AdTreeNode[] = [];

  for (const node of nodes) {
    const treeNode = byId.get(node.id);

    // Unreachable — every id was just inserted — but keeps the access total
    // without a non-null assertion.
    if (treeNode === undefined) {
      continue;
    }

    const parent =
      node.parent_id === null ? undefined : byId.get(node.parent_id);

    if (parent === undefined) {
      roots.push(treeNode);
    } else {
      parent.children.push(treeNode);
    }
  }

  return roots;
}
