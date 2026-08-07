import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiClient } from "../api/client";
import {
  mockNodes,
  mockEdges,
  mockClusters,
  mockLinkSuggestions,
} from "../data/mockData";
import { mockSearch } from "../search/mockSearch";
import { computeMockTopology } from "../analytics/mockTopology";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL  || "http://localhost:8000";

/** Chèn/cập nhật 1 item theo id vào mảng, không có thì thêm mới. */
function upsertById(list, item) {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...list, item];
  const copy = [...list];
  copy[idx] = item;
  return copy;
}

function removeById(list, id) {
  return list.filter((x) => x.id !== id);
}

/**
 * source: "mock" | "live"
 * Khi source === "live", gọi API thật; nếu lỗi (backend chưa chạy), tự
 * fallback về mock + báo lỗi ra `error`, không crash UI. Khi "live", cũng
 * mở kết nối WebSocket /ws để tự cập nhật graph theo thời gian thực —
 * không cần refetch toàn bộ mỗi khi có thay đổi.
 */
export function useGraphData(source, apiBaseUrl = DEFAULT_API_BASE_URL) {
  const [nodes, setNodes] = useState(mockNodes);
  const [edges, setEdges] = useState(mockEdges);
  const [clusters, setClusters] = useState(mockClusters);
  const [linkSuggestions, setLinkSuggestions] = useState(mockLinkSuggestions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState("disconnected");

  const client = useMemo(() => createApiClient(apiBaseUrl), [apiBaseUrl]);

  async function refetchAllImpl() {
    const [liveNodes, liveEdges, liveClusters, liveSuggestions] = await Promise.all([
      client.listNodes(),
      client.listEdges(),
      client.getClusters(),
      client.getLinkSuggestions(20),
    ]);
    setNodes(liveNodes);
    setEdges(liveEdges);
    setClusters(liveClusters);
    setLinkSuggestions(liveSuggestions);
  }
  const refetchAll = useCallback(refetchAllImpl, [client]);

  // Tải dữ liệu ban đầu (mock hoặc snapshot từ API thật).
  useEffect(() => {
    if (source === "mock") {
      setNodes(mockNodes);
      setEdges(mockEdges);
      setClusters(mockClusters);
      setLinkSuggestions(mockLinkSuggestions);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    refetchAll()
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        // Fallback về mock để UI không trống trơn khi backend chưa chạy.
        setNodes(mockNodes);
        setEdges(mockEdges);
        setClusters(mockClusters);
        setLinkSuggestions(mockLinkSuggestions);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source, client, refetchAll]);

  // Nối WebSocket khi ở chế độ "live" — patch state tăng dần theo event,
  // không refetch toàn bộ graph mỗi lần có thay đổi.
  useEffect(() => {
    if (source !== "live") {
      setRealtimeStatus("disconnected");
      return;
    }

    const disconnect = client.connectRealtime(
      (message) => {
        const { event, data } = message;
        switch (event) {
          case "node_created":
          case "node_updated":
            setNodes((prev) => upsertById(prev, data));
            break;
          case "node_deleted":
            setNodes((prev) => removeById(prev, data.id));
            break;
          case "edge_created":
          case "edge_updated":
            setEdges((prev) => upsertById(prev, data));
            break;
          case "edge_deleted":
            setEdges((prev) => removeById(prev, data.id));
            break;
          case "graph_imported":
            // Event chỉ mang {nodes_created, edges_created, edges_skipped} —
            // không đủ để patch tăng dần, nên refetch toàn bộ.
            refetchAll().catch(() => {
              /* refetch lỗi thì giữ nguyên state cũ, không crash UI */
            });
            break;
          default:
            // Event lạ chưa biết — bỏ qua thay vì crash.
            break;
        }
      },
      { onStatusChange: setRealtimeStatus }
    );

    return () => {
      disconnect();
      setRealtimeStatus("disconnected");
    };
  }, [source, client, refetchAll]);

  return {
    nodes,
    edges,
    clusters,
    linkSuggestions,
    loading,
    error,
    realtimeStatus, // "disconnected" | "open" | "closed" | "error"

    // --- Mutations ---
    // Ở chế độ mock: sửa state cục bộ trực tiếp, không gọi mạng.
    // Ở chế độ live: gọi API thật; state cũng được cập nhật ngay từ response
    // (không đợi WebSocket dội lại) để UI phản hồi tức thì — event WS đến
    // sau chỉ là upsert trùng, vô hại vì upsertById là idempotent.
    async createNode(data) {
      if (source === "mock") {
        const node = { id: crypto.randomUUID(), embedding: null, graph_embedding: null, ...data };
        setNodes((prev) => [...prev, node]);
        return node;
      }
      const node = await client.createNode(data);
      setNodes((prev) => upsertById(prev, node));
      return node;
    },

    async updateNode(nodeId, data) {
      if (source === "mock") {
        let updated = null;
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id !== nodeId) return n;
            updated = { ...n, ...data };
            return updated;
          })
        );
        return updated;
      }
      const node = await client.updateNode(nodeId, data);
      setNodes((prev) => upsertById(prev, node));
      return node;
    },

    async deleteNode(nodeId) {
      if (source === "mock") {
        setNodes((prev) => removeById(prev, nodeId));
        setEdges((prev) => prev.filter((e) => e.source_id !== nodeId && e.target_id !== nodeId));
        return;
      }
      await client.deleteNode(nodeId);
      setNodes((prev) => removeById(prev, nodeId));
    },

    async createEdge(data) {
      if (source === "mock") {
        const sourceExists = nodes.some((n) => n.id === data.source_id);
        const targetExists = nodes.some((n) => n.id === data.target_id);
        if (!sourceExists || !targetExists) {
          throw new Error("source_id hoặc target_id không tồn tại");
        }
        const edge = { id: crypto.randomUUID(), ...data };
        setEdges((prev) => [...prev, edge]);
        return edge;
      }
      const edge = await client.createEdge(data);
      setEdges((prev) => upsertById(prev, edge));
      return edge;
    },

    async updateEdge(edgeId, data) {
      if (source === "mock") {
        let updated = null;
        setEdges((prev) =>
          prev.map((e) => {
            if (e.id !== edgeId) return e;
            updated = { ...e, ...data };
            return updated;
          })
        );
        return updated;
      }
      const edge = await client.updateEdge(edgeId, data);
      setEdges((prev) => upsertById(prev, edge));
      return edge;
    },

    async deleteEdge(edgeId) {
      if (source === "mock") {
        setEdges((prev) => removeById(prev, edgeId));
        return;
      }
      await client.deleteEdge(edgeId);
      setEdges((prev) => removeById(prev, edgeId));
    },

    // Trả về đúng shape SearchResult thật: { matches, subgraph_nodes, subgraph_edges }
    async search(q, options) {
      if (source == "mock") {
        return mockSearch(nodes, edges, q, options);
      }
      return client.search(q, options);
    },

    async getTopology() {
      if (source === "mock") {
        return computeMockTopology(nodes, edges);
      }
      return client.getTopology();
    },

    async exportGraph() {
      if (source === "mock") {
        return { nodes, edges };
      }
      return client.exportGraph();
    },

    async importGraph(data) {
      if (source === "mock") {
        // Cùng logic remap id như backend thật (graph/api.py import_graph):
        // id trong file luôn được thay bằng id mới, edge dangling thì bỏ qua.
        const idMap = new Map();
        const newNodes = data.nodes.map((n) => {
          const newId = crypto.randomUUID();
          idMap.set(n.id, newId);
          return { ...n, id: newId, embedding: null, graph_embedding: null };
        });
        const newEdges = [];
        let edgesSkipped = 0;
        for (const e of data.edges) {
          const sourceId = idMap.get(e.source_id);
          const targetId = idMap.get(e.target_id);
          if (!sourceId || !targetId) {
            edgesSkipped += 1;
            continue;
          }
          newEdges.push({ ...e, id: crypto.randomUUID(), source_id: sourceId, target_id: targetId });
        }
        setNodes((prev) => [...prev, ...newNodes]);
        setEdges((prev) => [...prev, ...newEdges]);
        return {
          nodes_created: newNodes.length,
          edges_created: newEdges.length,
          edges_skipped: edgesSkipped,
        };
      }
      const result = await client.importGraph(data);
      // Server đã tạo xong toàn bộ node/edge với id mới — refetch để lấy
      // đúng state (không tự patch vì response chỉ có số lượng, không có
      // node/edge cụ thể).
      await refetchAll();
      return result;
    },
  };
}