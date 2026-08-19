import { describe, expect, it } from "vitest";
import { mockNodes, mockEdges, mockClusters, mockLinkSuggestions } from "./mockData";

/**
 * Guards the thing that actually broke once already (frontend/src/data/
 * mockData.js was silently gitignored - see Harness/Decisions.md,
 * "2026-08-17: .gitignore data/ rules anchored to repo root"): the file
 * exists, is importable, and its shape stays in sync with the real
 * backend models (src/braintodo/models/node.py, edge.py, cluster.py,
 * link_suggestion.py) so mock mode stays a faithful preview of live data.
 */
describe("mockData", () => {
  it("exports non-empty node/edge/cluster/link-suggestion arrays", () => {
    expect(mockNodes.length).toBeGreaterThan(0);
    expect(mockEdges.length).toBeGreaterThan(0);
    expect(mockClusters.length).toBeGreaterThan(0);
    expect(mockLinkSuggestions.length).toBeGreaterThan(0);
  });

  it("every node matches the real Node model shape", () => {
    for (const node of mockNodes) {
      expect(node).toHaveProperty("id");
      expect(node).toHaveProperty("title");
      expect(typeof node.id).toBe("string");
      expect(typeof node.title).toBe("string");
      // content/tags/weight/color/shape/size all have server-side defaults
      // in NodeCreate, but every field is present on the Node response
      // model itself - mock data should mirror what a real response looks
      // like, not what a minimal create request looks like.
      expect(node).toHaveProperty("content");
      expect(node).toHaveProperty("tags");
      expect(node).toHaveProperty("weight");
      expect(node).toHaveProperty("color");
      expect(node).toHaveProperty("shape");
      expect(node).toHaveProperty("size");
    }
  });

  it("has unique node ids", () => {
    const ids = mockNodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every edge references an existing node on both ends", () => {
    const nodeIds = new Set(mockNodes.map((n) => n.id));
    for (const edge of mockEdges) {
      expect(edge).toHaveProperty("id");
      expect(edge).toHaveProperty("source_id");
      expect(edge).toHaveProperty("target_id");
      expect(nodeIds.has(edge.source_id)).toBe(true);
      expect(nodeIds.has(edge.target_id)).toBe(true);
    }
  });

  it("every cluster only references existing node ids", () => {
    const nodeIds = new Set(mockNodes.map((n) => n.id));
    for (const cluster of mockClusters) {
      expect(cluster).toHaveProperty("cluster_id");
      expect(cluster).toHaveProperty("node_ids");
      for (const id of cluster.node_ids) {
        expect(nodeIds.has(id)).toBe(true);
      }
    }
  });

  it("every link suggestion references existing nodes and has a numeric score", () => {
    const nodeIds = new Set(mockNodes.map((n) => n.id));
    for (const suggestion of mockLinkSuggestions) {
      expect(nodeIds.has(suggestion.source_id)).toBe(true);
      expect(nodeIds.has(suggestion.target_id)).toBe(true);
      expect(typeof suggestion.score).toBe("number");
    }
  });
});