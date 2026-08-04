/**
 * Tính topology metrics ở phía client cho chế độ mock — dùng khi không có
 * backend. Trả về đúng shape `NodeTopology` thật:
 * { node_id, degree, degree_centrality, betweenness_centrality, pagerank }
 *
 * Giới hạn có chủ đích: `betweenness_centrality` luôn trả 0 ở mock — thuật
 * toán thật (Brandes) không đáng để port sang JS chỉ cho preview UI.
 * `pagerank` dùng power-iteration chuẩn (không cần khớp bit-for-bit với
 * `analytics/pagerank.py` thật, chỉ cần đủ hợp lý để overlay có ý nghĩa).
 */
export function computeMockTopology(nodes, edges, { damping = 0.85, iterations = 30 } = {}) {
  const n = nodes.length;
  if (n === 0) return [];

  const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
  for (const e of edges) {
    if (!adjacency.has(e.source_id) || !adjacency.has(e.target_id)) continue;
    adjacency.get(e.source_id).add(e.target_id);
    adjacency.get(e.target_id).add(e.source_id);
  }

  // PageRank (đồ thị vô hướng, coi mỗi cạnh là 2 chiều) bằng power-iteration.
  let ranks = new Map(nodes.map((node) => [node.id, 1 / n]));
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map();
    let danglingSum = 0;
    for (const node of nodes) {
      const neighbors = adjacency.get(node.id);
      if (neighbors.size === 0) danglingSum += ranks.get(node.id);
    }
    for (const node of nodes) {
      let sum = 0;
      for (const [otherId, neighbors] of adjacency) {
        if (neighbors.has(node.id)) sum += ranks.get(otherId) / neighbors.size;
      }
      next.set(node.id, (1 - damping) / n + damping * (sum + danglingSum / n));
    }
    ranks = next;
  }

  return nodes.map((node) => {
    const degree = adjacency.get(node.id).size;
    return {
      node_id: node.id,
      degree,
      degree_centrality: n > 1 ? degree / (n - 1) : 0,
      betweenness_centrality: 0, // xem giới hạn ở comment đầu file
      pagerank: ranks.get(node.id),
    };
  });
}