import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "../api/client";
import {
  mockNodes,
  mockEdges,
  mockClusters,
  mockLinkSuggestions,
} from "../data/mockData";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * source: "mock" | "live"
 * Khi source === "live", gọi API thật; nếu lỗi (backend chưa chạy), tự
 * fallback về mock + báo lỗi ra `error`, không crash UI.
 */
export function useGraphData(source, apiBaseUrl = DEFAULT_API_BASE_URL) {
  const [nodes, setNodes] = useState(mockNodes);
  const [edges, setEdges] = useState(mockEdges);
  const [clusters, setClusters] = useState(mockClusters);
  const [linkSuggestions, setLinkSuggestions] = useState(mockLinkSuggestions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const client = useMemo(() => createApiClient(apiBaseUrl), [apiBaseUrl]);

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

  return { nodes, edges, clusters, linkSuggestions, loading, error };
}