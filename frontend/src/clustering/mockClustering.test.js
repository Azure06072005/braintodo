import { describe, expect, it } from "vitest";
import { computeMockClusters } from "./mockClustering";

describe("computeMockClusters", () => {
  it("groups nodes joined by a path of edges into one cluster", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [
      { source_id: "a", target_id: "b" },
      { source_id: "b", target_id: "c" },
    ];
    const clusters = computeMockClusters(nodes, edges);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].node_ids.sort()).toEqual(["a", "b", "c"]);
  });

  it("puts nodes with no edges into their own singleton cluster", () => {
    const nodes = [{ id: "a" }, { id: "b" }];
    const clusters = computeMockClusters(nodes, []);
    expect(clusters).toHaveLength(2);
    expect(clusters.map((c) => c.node_ids)).toEqual(
      expect.arrayContaining([["a"], ["b"]])
    );
  });

  it("splits disconnected components into separate clusters", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const edges = [{ source_id: "a", target_id: "b" }, { source_id: "c", target_id: "d" }];
    const clusters = computeMockClusters(nodes, edges);
    expect(clusters).toHaveLength(2);
    const groupOf = (id) => clusters.find((c) => c.node_ids.includes(id)).cluster_id;
    expect(groupOf("a")).toBe(groupOf("b"));
    expect(groupOf("c")).toBe(groupOf("d"));
    expect(groupOf("a")).not.toBe(groupOf("c"));
  });

  it("ignores edges referencing ids not present in nodes", () => {
    const nodes = [{ id: "a" }, { id: "b" }];
    const edges = [{ source_id: "a", target_id: "ghost" }];
    const clusters = computeMockClusters(nodes, edges);
    expect(clusters).toHaveLength(2);
  });

  it("returns an empty array for an empty graph", () => {
    expect(computeMockClusters([], [])).toEqual([]);
  });

  it("every node appears in exactly one cluster (partition invariant)", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];
    const edges = [
      { source_id: "a", target_id: "b" },
      { source_id: "b", target_id: "c" },
      { source_id: "d", target_id: "e" },
    ];
    const clusters = computeMockClusters(nodes, edges);
    const allIds = clusters.flatMap((c) => c.node_ids);
    expect(allIds.sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});