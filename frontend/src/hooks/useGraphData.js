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
import { computeMockClusters } from "../clustering/mockClustering";

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
 *
 * IMPORTANT: every function on the returned object is wrapped in
 * useCallback, and the object itself in useMemo. Consumers (e.g. AppPage's
 * topology useEffect) put these functions in dependency arrays; before this
 * fix, a fresh object literal (and fresh function references) were returned
 * on every render, which retriggered any effect depending on them
 * immediately after it ran, producing an infinite render loop and a React
 * "Maximum update depth exceeded" crash. See Decisions.md.
 */
export function useGraphData(source, apiBaseUrl = DEFAULT_API_BASE_URL, token = null) {
  const [nodes, setNodes] = useState(mockNodes);
  const [edges, setEdges] = useState(mockEdges);
  const [clusters, setClusters] = useState(mockClusters);
  const [linkSuggestions, setLinkSuggestions] = useState(mockLinkSuggestions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState("disconnected");

  const client = useMemo(() => createApiClient(apiBaseUrl, token), [apiBaseUrl, token]);

  const refetchAll = useCallback(async () => {
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
  }, [client]);

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

  // --- Mutations ---
  const createNode = useCallback(
    async (data) => {
      if (source === "mock") {
        const node = { id: crypto.randomUUID(), embedding: null, graph_embedding: null, ...data };
        const newNodes = [...nodes, node];
        setNodes(newNodes);
        // Structural change (new node) - recompute clusters so a freshly
        // added node isn't invisible to hull rendering. See mockClustering.js.
        setClusters(computeMockClusters(newNodes, edges));
        return node;
      }
      const node = await client.createNode(data);
      setNodes((prev) => upsertById(prev, node));
      return node;
    },
    [source, nodes, edges, client]
  );

  const updateNode = useCallback(
    async (nodeId, data) => {
      if (source === "mock") {
        let updated = null;
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id !== nodeId) return n;
            updated = { ...n, ...data };
            return updated;
          })
        );
        // Editing a node's fields doesn't change graph topology (ids/edges
        // are unchanged), so clusters don't need recomputing here.
        return updated;
      }
      const node = await client.updateNode(nodeId, data);
      setNodes((prev) => upsertById(prev, node));
      return node;
    },
    [source, client]
  );

  const deleteNode = useCallback(
    async (nodeId) => {
      if (source === "mock") {
        const newNodes = removeById(nodes, nodeId);
        const newEdges = edges.filter((e) => e.source_id !== nodeId && e.target_id !== nodeId);
        setNodes(newNodes);
        setEdges(newEdges);
        setClusters(computeMockClusters(newNodes, newEdges));
        return;
      }
      await client.deleteNode(nodeId);
      setNodes((prev) => removeById(prev, nodeId));
    },
    [source, nodes, edges, client]
  );

  const createEdge = useCallback(
    async (data) => {
      if (source === "mock") {
        const sourceExists = nodes.some((n) => n.id === data.source_id);
        const targetExists = nodes.some((n) => n.id === data.target_id);
        if (!sourceExists || !targetExists) {
          throw new Error("source_id hoặc target_id không tồn tại");
        }
        const edge = { id: crypto.randomUUID(), ...data };
        const newEdges = [...edges, edge];
        setEdges(newEdges);
        // Structural change (new edge can merge two clusters) - recompute.
        setClusters(computeMockClusters(nodes, newEdges));
        return edge;
      }
      const edge = await client.createEdge(data);
      setEdges((prev) => upsertById(prev, edge));
      return edge;
    },
    [source, nodes, edges, client]
  );

  const updateEdge = useCallback(
    async (edgeId, data) => {
      if (source === "mock") {
        let updated = null;
        setEdges((prev) =>
          prev.map((e) => {
            if (e.id !== edgeId) return e;
            updated = { ...e, ...data };
            return updated;
          })
        );
        // Relation type/style edits don't change which nodes are connected
        // (source_id/target_id untouched by the edit form), so no recompute.
        return updated;
      }
      const edge = await client.updateEdge(edgeId, data);
      setEdges((prev) => upsertById(prev, edge));
      return edge;
    },
    [source, client]
  );

  const deleteEdge = useCallback(
    async (edgeId) => {
      if (source === "mock") {
        const newEdges = removeById(edges, edgeId);
        setEdges(newEdges);
        // Structural change (removing an edge can split a cluster in two).
        setClusters(computeMockClusters(nodes, newEdges));
        return;
      }
      await client.deleteEdge(edgeId);
      setEdges((prev) => removeById(prev, edgeId));
    },
    [source, nodes, edges, client]
  );

  // Trả về đúng shape SearchResult thật: { matches, subgraph_nodes, subgraph_edges }
  const search = useCallback(
    async (q, options) => {
      if (source === "mock") {
        return mockSearch(nodes, edges, q, options);
      }
      return client.search(q, options);
    },
    [source, nodes, edges, client]
  );

  const getTopology = useCallback(async () => {
    if (source === "mock") {
      return computeMockTopology(nodes, edges);
    }
    return client.getTopology();
  }, [source, nodes, edges, client]);

  const exportGraph = useCallback(async () => {
    if (source === "mock") {
      return { nodes, edges };
    }
    return client.exportGraph();
  }, [source, nodes, edges, client]);

  const importGraph = useCallback(
    async (data) => {
      if (source === "mock") {
        // Cùng logic remap id như backend thật (graph/api.py import_graph):
        // id trong file luôn được thay bằng id mới, edge dangling thì bỏ qua.
        const idMap = new Map();
        const newNodes = data.nodes.map((n) => {
          const newId = crypto.randomUUID();
          idMap.set(n.id, newId);
          return { ...n, id: newId, embedding: null, graph_embedding: null };
        });
        const importedEdges = [];
        let edgesSkipped = 0;
        for (const e of data.edges) {
          const sourceId = idMap.get(e.source_id);
          const targetId = idMap.get(e.target_id);
          if (!sourceId || !targetId) {
            edgesSkipped += 1;
            continue;
          }
          importedEdges.push({ ...e, id: crypto.randomUUID(), source_id: sourceId, target_id: targetId });
        }
        const combinedNodes = [...nodes, ...newNodes];
        const combinedEdges = [...edges, ...importedEdges];
        setNodes(combinedNodes);
        setEdges(combinedEdges);
        // Fix: previously `clusters` was never touched here, so imported
        // graphs (e.g. a real project's node/edge export) rendered with no
        // cluster hulls at all - hullPathFor() in GraphCanvas.jsx looks up
        // cluster.node_ids against the imported nodes' new ids, which never
        // matched the stale hardcoded mockClusters ids ("p", "c1", ...).
        setClusters(computeMockClusters(combinedNodes, combinedEdges));
        return {
          nodes_created: newNodes.length,
          edges_created: importedEdges.length,
          edges_skipped: edgesSkipped,
        };
      }
      const result = await client.importGraph(data);
      await refetchAll();
      return result;
    },
    [source, nodes, edges, client, refetchAll]
  );

  return useMemo(
    () => ({
      nodes,
      edges,
      clusters,
      linkSuggestions,
      loading,
      error,
      realtimeStatus,
      createNode,
      updateNode,
      deleteNode,
      createEdge,
      updateEdge,
      deleteEdge,
      search,
      getTopology,
      exportGraph,
      importGraph,
    }),
    [
      nodes,
      edges,
      clusters,
      linkSuggestions,
      loading,
      error,
      realtimeStatus,
      createNode,
      updateNode,
      deleteNode,
      createEdge,
      updateEdge,
      deleteEdge,
      search,
      getTopology,
      exportGraph,
      importGraph,
    ]
  );
}