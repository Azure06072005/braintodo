import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "../api/client";
import {
  mockNodes,
  mockEdges,
  mockClusters,
  mockLinkSuggestions,
} from "../data/mockData";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

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

    Promise.all([
      client.listNodes(),
      client.listEdges(),
      client.getClusters(),
      client.getLinkSuggestions(20),
    ])
      .then(([liveNodes, liveEdges, liveClusters, liveSuggestions]) => {
        if (cancelled) return;
        setNodes(liveNodes);
        setEdges(liveEdges);
        setClusters(liveClusters);
        setLinkSuggestions(liveSuggestions);
      })
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
  }, [source, client]);

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
  }, [source, client]);

  return {
    nodes,
    edges,
    clusters,
    linkSuggestions,
    loading,
    error,
    realtimeStatus, // "disconnected" | "open" | "closed" | "error"
  };
}