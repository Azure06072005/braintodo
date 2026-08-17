/**
 * Dữ liệu mẫu — giữ ĐÚNG shape mà backend braintodo thật trả về, để khi
 * chuyển sang "live" không cần sửa component nào khác.
 *
 * Node: id, title, content, tags, weight, color, shape, size,
 *       embedding (384-d thật / null nếu chưa tính), graph_embedding
 * Edge: id, source_id, target_id, relation_type, color, style
 */

function fakeVector(dim, seed) {
  return Array.from({ length: dim }, (_, i) => Math.sin(seed + i) * 0.5 + 0.5);
}

export const mockNodes = [
  {
    id: "p",
    title: "Ra mắt tính năng Search",
    content: "Xây dựng semantic + keyword search cho braintodo",
    tags: ["project", "phase-3"],
    weight: 3,
    color: "#7f77dd",
    shape: "square",
    size: 20,
    embedding: fakeVector(8, 1),
    graph_embedding: fakeVector(4, 1),
  },
  {
    id: "c1",
    title: "Thiết kế thuật toán keyword + semantic match",
    content: "Kết hợp substring match và cosine similarity",
    tags: ["subtask", "design"],
    weight: 1,
    color: "#1d9e75",
    shape: "circle",
    size: 12,
    embedding: fakeVector(8, 2),
    graph_embedding: fakeVector(4, 2),
  },
  {
    id: "c2",
    title: "Viết endpoint GET /search",
    content: "Nhận q, limit, depth; trả về matches + subgraph",
    tags: ["subtask", "implementation"],
    weight: 1,
    color: "#1d9e75",
    shape: "circle",
    size: 12,
    embedding: fakeVector(8, 3),
    graph_embedding: null,
  },
  {
    id: "c3",
    title: "Viết test cho search",
    content: "test_search.py và test_search_api.py",
    tags: ["subtask", "testing"],
    weight: 1,
    color: "#1d9e75",
    shape: "circle",
    size: 12,
    embedding: null,
    graph_embedding: null,
  },
  {
    id: "g1",
    title: "Keyword match",
    content: "Substring match trên title/content/tags, không phân biệt hoa thường",
    tags: ["detail"],
    weight: 0.6,
    color: "#d85a30",
    shape: "circle",
    size: 8,
    embedding: fakeVector(8, 4),
    graph_embedding: fakeVector(4, 4),
  },
  {
    id: "g2",
    title: "Semantic match",
    content: "Cosine similarity giữa embedding query và embedding node, ngưỡng 0.5",
    tags: ["detail"],
    weight: 0.6,
    color: "#d85a30",
    shape: "circle",
    size: 8,
    embedding: fakeVector(8, 5),
    graph_embedding: fakeVector(4, 5),
  },
  {
    id: "g3",
    title: "BFS subgraph",
    content: "Mở rộng từ node khớp ra depth hop lân cận",
    tags: ["detail"],
    weight: 0.6,
    color: "#d85a30",
    shape: "circle",
    size: 8,
    embedding: null,
    graph_embedding: null,
  },
];

export const mockEdges = [
  { id: "e1", source_id: "p", target_id: "c1", relation_type: "expands", color: "#999999", style: "solid" },
  { id: "e2", source_id: "p", target_id: "c2", relation_type: "part_of", color: "#999999", style: "solid" },
  { id: "e3", source_id: "p", target_id: "c3", relation_type: "part_of", color: "#999999", style: "solid" },
  { id: "e4", source_id: "c1", target_id: "g1", relation_type: "part_of", color: "#999999", style: "solid" },
  { id: "e5", source_id: "c1", target_id: "g2", relation_type: "part_of", color: "#999999", style: "solid" },
  { id: "e6", source_id: "c2", target_id: "g3", relation_type: "expands", color: "#999999", style: "solid" },
];

export const mockClusters = [
  { cluster_id: 0, node_ids: ["p", "c1", "g1", "g2"] },
  { cluster_id: 1, node_ids: ["c2", "g3"] },
  { cluster_id: 2, node_ids: ["c3"] },
];

export const mockLinkSuggestions = [
  { source_id: "g1", target_id: "g3", score: 0.71 },
  { source_id: "c3", target_id: "g2", score: 0.58 },
];