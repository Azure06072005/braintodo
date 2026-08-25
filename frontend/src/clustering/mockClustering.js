/**
 * Lightweight client-side clustering fallback for mock mode.
 *
 * Mock mode has no backend to run real Louvain community detection (see
 * src/braintodo/clustering/service.py for the real algorithm), so this
 * computes connected components instead: any nodes joined by a path of
 * edges land in the same cluster; a node with no edges becomes its own
 * singleton cluster.
 *
 * Deliberately NOT wired into a passive useEffect watching [nodes, edges]:
 * the bundled demo graph (mockData.js) is a fully-connected star rooted at
 * node "p", so a naive connected-components pass over it collapses the
 * curated 3-cluster demo into a single blob on first render. Callers should
 * invoke computeMockClusters() explicitly after a structural mutation
 * (create/delete node or edge, import) rather than on every render.
 */

/** @param {{id: string}[]} nodes
 *  @param {{source_id: string, target_id: string}[]} edges
 *  @returns {{cluster_id: number, node_ids: string[]}[]}
 */
export function computeMockClusters(nodes, edges) {
  const parent = new Map(nodes.map((n) => [n.id, n.id]));

  function find(id) {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root);
    }
    let cur = id;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur);
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }

  for (const e of edges) {
    if (parent.has(e.source_id) && parent.has(e.target_id)) {
      union(e.source_id, e.target_id);
    }
  }

  const groups = new Map();
  for (const n of nodes) {
    const root = find(n.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(n.id);
  }

  return Array.from(groups.values()).map((node_ids, cluster_id) => ({
    cluster_id,
    node_ids: [...node_ids].sort(),
  }));
}