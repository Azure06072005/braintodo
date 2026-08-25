import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGraphData } from "./useGraphData";
import { mockNodes, mockEdges } from "../data/mockData";

/**
 * Mock-mode smoke tests: useGraphData(source="mock") never touches the
 * network, so these exercise the hook's own state logic (CRUD, search,
 * topology, export/import) against the same data shapes the real backend
 * uses (Node/Edge/Cluster/LinkSuggestion - see mockData.js's own header
 * comment on shape parity with the real backend models).
 */
describe("useGraphData (mock mode)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with the mock dataset", () => {
    const { result } = renderHook(() => useGraphData("mock"));
    expect(result.current.nodes).toEqual(mockNodes);
    expect(result.current.edges).toEqual(mockEdges);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("createNode adds a node with a generated id", async () => {
    const { result } = renderHook(() => useGraphData("mock"));
    const startCount = result.current.nodes.length;

    let created;
    await act(async () => {
      created = await result.current.createNode({ title: "New idea", content: "details" });
    });

    expect(created.id).toBeTruthy();
    expect(created.title).toBe("New idea");
    expect(result.current.nodes).toHaveLength(startCount + 1);
    expect(result.current.nodes.some((n) => n.id === created.id)).toBe(true);
  });

  it("updateNode patches only the targeted node", async () => {
    const { result } = renderHook(() => useGraphData("mock"));
    const target = result.current.nodes[0];

    let updated;
    await act(async () => {
      updated = await result.current.updateNode(target.id, { title: "Renamed" });
    });

    expect(updated.title).toBe("Renamed");
    const others = result.current.nodes.filter((n) => n.id !== target.id);
    // Every other node is untouched.
    for (const other of others) {
      const original = mockNodes.find((n) => n.id === other.id);
      expect(other).toEqual(original);
    }
  });

  it("deleteNode removes the node and any edges touching it", async () => {
    const { result } = renderHook(() => useGraphData("mock"));
    const target = result.current.nodes[0];
    const hadConnectedEdges = result.current.edges.some(
      (e) => e.source_id === target.id || e.target_id === target.id
    );
    expect(hadConnectedEdges).toBe(true); // sanity check on the fixture itself

    await act(async () => {
      await result.current.deleteNode(target.id);
    });

    expect(result.current.nodes.some((n) => n.id === target.id)).toBe(false);
    expect(
      result.current.edges.some((e) => e.source_id === target.id || e.target_id === target.id)
    ).toBe(false);
  });

  it("createEdge rejects a dangling source_id/target_id, matching the real backend's 400", async () => {
    const { result } = renderHook(() => useGraphData("mock"));

    await expect(
      act(async () => {
        await result.current.createEdge({ source_id: "does-not-exist", target_id: "also-missing" });
      })
    ).rejects.toThrow();
  });

  it("createEdge connects two existing nodes", async () => {
    const { result } = renderHook(() => useGraphData("mock"));
    const [a, b] = result.current.nodes;
    const startCount = result.current.edges.length;

    let edge;
    await act(async () => {
      edge = await result.current.createEdge({ source_id: a.id, target_id: b.id });
    });

    expect(edge.source_id).toBe(a.id);
    expect(edge.target_id).toBe(b.id);
    expect(result.current.edges).toHaveLength(startCount + 1);
  });

  it("search finds nodes by keyword using mockSearch, shaped like the real SearchResult", async () => {
    const { result } = renderHook(() => useGraphData("mock"));
    const target = result.current.nodes[0];
    const keyword = target.title.split(" ")[0];

    let searchResult;
    await act(async () => {
      searchResult = await result.current.search(keyword);
    });

    expect(searchResult).toHaveProperty("matches");
    expect(searchResult).toHaveProperty("subgraph_nodes");
    expect(searchResult).toHaveProperty("subgraph_edges");
    expect(searchResult.matches.some((m) => m.node_id === target.id)).toBe(true);
  });

  it("getTopology returns one metrics entry per node, shaped like NodeTopology", async () => {
    const { result } = renderHook(() => useGraphData("mock"));

    let topology;
    await act(async () => {
      topology = await result.current.getTopology();
    });

    expect(topology).toHaveLength(result.current.nodes.length);
    for (const entry of topology) {
      expect(entry).toHaveProperty("node_id");
      expect(entry).toHaveProperty("degree");
      expect(entry).toHaveProperty("degree_centrality");
      expect(entry).toHaveProperty("pagerank");
    }
  });

  it("exportGraph returns the current in-memory graph", async () => {
    const { result } = renderHook(() => useGraphData("mock"));

    let exported;
    await act(async () => {
      exported = await result.current.exportGraph();
    });

    expect(exported.nodes).toEqual(result.current.nodes);
    expect(exported.edges).toEqual(result.current.edges);
  });

  it("importGraph remaps ids and skips edges with dangling references", async () => {
    const { result } = renderHook(() => useGraphData("mock"));
    const startNodeCount = result.current.nodes.length;
    const startEdgeCount = result.current.edges.length;

    let importResult;
    await act(async () => {
      importResult = await result.current.importGraph({
        nodes: [
          { id: "old-1", title: "Imported A" },
          { id: "old-2", title: "Imported B" },
        ],
        edges: [
          { source_id: "old-1", target_id: "old-2" }, // valid, both remapped
          { source_id: "old-1", target_id: "does-not-exist" }, // dangling, should skip
        ],
      });
    });

    expect(importResult).toEqual({ nodes_created: 2, edges_created: 1, edges_skipped: 1 });
    expect(result.current.nodes).toHaveLength(startNodeCount + 2);
    expect(result.current.edges).toHaveLength(startEdgeCount + 1);
    // Imported nodes got fresh ids, not the placeholder ids from the file.
    expect(result.current.nodes.some((n) => n.id === "old-1")).toBe(false);
    expect(result.current.nodes.some((n) => n.title === "Imported A")).toBe(true);
  });

  it("switching source away and back to mock resets to the mock dataset", async () => {
    const originalFetch = global.fetch;
    // Mock mode never calls fetch, but switching to "live" does - make it
    // fail fast so this test doesn't depend on a real backend.
    global.fetch = () => Promise.reject(new Error("no backend in this test"));

    const { result, rerender } = renderHook(({ source }) => useGraphData(source), {
      initialProps: { source: "mock" },
    });

    await act(async () => {
      await result.current.createNode({ title: "Temporary" });
    });
    expect(result.current.nodes.length).toBe(mockNodes.length + 1);

    rerender({ source: "live" });
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    rerender({ source: "mock" });
    await waitFor(() => {
      expect(result.current.nodes).toEqual(mockNodes);
    });

    global.fetch = originalFetch;
  });

  it("live mode attaches the token as a Bearer Authorization header on REST calls", async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0, skip: 0, limit: 200 }),
    });
    global.fetch = fetchMock;

    const { unmount } = renderHook(() =>
      useGraphData("live", "http://localhost:8000", "my-jwt-token")
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    // Every call the initial live-mode fetch makes (listNodes/listEdges/
    // getClusters/getLinkSuggestions) should carry the same bearer token -
    // check at least one, since this is the exact bug that was previously
    // silently broken (no call carried a token at all).
    const [, options] = fetchMock.mock.calls[0];
    expect(options?.headers?.Authorization).toBe("Bearer my-jwt-token");

    unmount();
    global.fetch = originalFetch;
  });

  it("live mode with no token sends no Authorization header (matches an unauthenticated GET -> 401 from the real backend)", async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Not authenticated" }),
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useGraphData("live"));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    const [, options] = fetchMock.mock.calls[0];
    expect(options?.headers?.Authorization).toBeUndefined();

    global.fetch = originalFetch;
  });

  it("importGraph recomputes clusters so imported nodes are covered by a cluster", async () => {
    const { result } = renderHook(() => useGraphData("mock"));

    let importResult;
    await act(async () => {
      importResult = await result.current.importGraph({
        nodes: [
          { id: "old-1", title: "Imported A" },
          { id: "old-2", title: "Imported B" },
          { id: "old-3", title: "Imported C, unconnected" },
        ],
        edges: [{ source_id: "old-1", target_id: "old-2" }],
      });
    });
    expect(importResult.nodes_created).toBe(3);

    const importedNodeIds = result.current.nodes
      .filter((n) => n.title.startsWith("Imported"))
      .map((n) => n.id);
    expect(importedNodeIds).toHaveLength(3);

    const allClusteredIds = new Set(result.current.clusters.flatMap((c) => c.node_ids));
    for (const id of importedNodeIds) {
      expect(allClusteredIds.has(id)).toBe(true);
    }

    const clusterOf = (id) => result.current.clusters.find((c) => c.node_ids.includes(id));
    const [a, b, c] = importedNodeIds;
    expect(clusterOf(a).cluster_id).toBe(clusterOf(b).cluster_id);
    expect(clusterOf(c).cluster_id).not.toBe(clusterOf(a).cluster_id);
  });

  it("createNode and deleteNode keep clusters covering every current node", async () => {
    const { result } = renderHook(() => useGraphData("mock"));

    let created;
    await act(async () => {
      created = await result.current.createNode({ title: "Isolated new idea" });
    });
    let allClusteredIds = new Set(result.current.clusters.flatMap((c) => c.node_ids));
    expect(allClusteredIds.has(created.id)).toBe(true);

    await act(async () => {
      await result.current.deleteNode(created.id);
    });
    allClusteredIds = new Set(result.current.clusters.flatMap((c) => c.node_ids));
    expect(allClusteredIds.has(created.id)).toBe(false);
  });

  it("returns referentially stable function identities across re-renders (regression for React #185 infinite loop)", () => {
    const { result, rerender } = renderHook(() => useGraphData("mock"));
    const first = result.current;
    rerender();
    const second = result.current;
    expect(second.getTopology).toBe(first.getTopology);
    expect(second.search).toBe(first.search);
    expect(second.exportGraph).toBe(first.exportGraph);
    expect(second.importGraph).toBe(first.importGraph);
    expect(second.createNode).toBe(first.createNode);
    expect(second.updateNode).toBe(first.updateNode);
    expect(second.deleteNode).toBe(first.deleteNode);
    expect(second.createEdge).toBe(first.createEdge);
    expect(second.updateEdge).toBe(first.updateEdge);
    expect(second.deleteEdge).toBe(first.deleteEdge);
  });
});