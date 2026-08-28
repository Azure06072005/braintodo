import { describe, expect, it } from "vitest";
import { computeLayout } from "./computeLayout";

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

describe("computeLayout", () => {
  it("returns an empty map for an empty graph", () => {
    expect(computeLayout([], []).size).toBe(0);
  });

  it("places a single node without NaN/Infinity", () => {
    const positions = computeLayout([{ id: "solo" }], []);
    const p = positions.get("solo");
    expect(p).toBeDefined();
    for (const v of [p.x, p.y, p.z]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("never produces NaN or Infinity positions for a moderately connected graph", () => {
    const nodes = Array.from({ length: 15 }, (_, i) => ({ id: `n${i}` }));
    const edges = nodes.slice(1).map((n, i) => ({ source_id: nodes[i].id, target_id: n.id }));
    const positions = computeLayout(nodes, edges);
    for (const p of positions.values()) {
      for (const v of [p.x, p.y, p.z]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("is deterministic across repeated calls on the same input", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [{ source_id: "a", target_id: "b" }, { source_id: "b", target_id: "c" }];
    const first = computeLayout(nodes, edges);
    const second = computeLayout(nodes, edges);
    for (const n of nodes) {
      expect(second.get(n.id)).toEqual(first.get(n.id));
    }
  });

  it("places directly-connected nodes closer together than nodes in a separate component", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "x" }, { id: "y" }, { id: "z" }];
    const edges = [
      { source_id: "a", target_id: "b" },
      { source_id: "b", target_id: "c" },
      { source_id: "a", target_id: "c" },
      { source_id: "x", target_id: "y" },
      { source_id: "y", target_id: "z" },
      { source_id: "x", target_id: "z" },
    ];
    const positions = computeLayout(nodes, edges);

    const withinTriangle = dist(positions.get("a"), positions.get("b"));
    const acrossComponents = dist(positions.get("a"), positions.get("x"));

    expect(withinTriangle).toBeLessThan(acrossComponents);
  });

  it("ignores edges referencing ids not present in nodes rather than crashing", () => {
    const nodes = [{ id: "a" }, { id: "b" }];
    const edges = [{ source_id: "a", target_id: "ghost" }];
    expect(() => computeLayout(nodes, edges)).not.toThrow();
  });

  it("every node gets a position (coverage), with no duplicates", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const positions = computeLayout(nodes, []);
    expect(positions.size).toBe(3);
    for (const n of nodes) {
      expect(positions.has(n.id)).toBe(true);
    }
  });
});