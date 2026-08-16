/**
 * Mock search — mô phỏng đại khái thuật toán thật ở backend
 * (search/service.py): keyword match trên title/content/tags, rồi mở rộng
 * subgraph bằng BFS theo `depth` hop. Dùng khi source === "mock" để có trải
 * nghiệm tìm kiếm nhất quán mà không cần backend.
 *
 * Trả về đúng shape `SearchResult` thật: { matches, subgraph_nodes, subgraph_edges }
 */
export function mockSearch(nodes, edges, q, { limit = 10, depth = 1 } = {}) {
  const query = q.trim().toLowerCase();
  if (!query) {
    return { matches: [], subgraph_nodes: [], subgraph_edges: [] };
  }

  const scored = nodes
    .map((node) => {
      const haystack = [node.title, node.content, ...(node.tags || [])]
        .join(" ")
        .toLowerCase();
      const hit = haystack.includes(query);
      // Điểm thô: khớp ở title được ưu tiên hơn khớp ở content/tags.
      const score = hit
        ? node.title.toLowerCase().includes(query)
          ? 1
          : 0.6
        : 0;
      return { node_id: node.id, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const matchedIds = new Set(scored.map((m) => m.node_id));

  // BFS mở rộng subgraph từ các node khớp, theo `depth` hop.
  const adjacency = new Map();
  for (const e of edges) {
    if (!adjacency.has(e.source_id)) adjacency.set(e.source_id, []);
    if (!adjacency.has(e.target_id)) adjacency.set(e.target_id, []);
    adjacency.get(e.source_id).push(e.target_id);
    adjacency.get(e.target_id).push(e.source_id);
  }

  const subgraphIds = new Set(matchedIds);
  let frontier = [...matchedIds];
  for (let hop = 0; hop < depth; hop++) {
    const next = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) || []) {
        if (!subgraphIds.has(neighbor)) {
          subgraphIds.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const subgraphNodes = [...subgraphIds].map((id) => nodesById.get(id)).filter(Boolean);
  const subgraphEdges = edges.filter(
    (e) => subgraphIds.has(e.source_id) && subgraphIds.has(e.target_id)
  );

  return { matches: scored, subgraph_nodes: subgraphNodes, subgraph_edges: subgraphEdges };
}