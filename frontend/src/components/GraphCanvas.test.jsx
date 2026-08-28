import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import GraphCanvas from "./GraphCanvas";

const testNodes = [
  { id: "n1", title: "Node 1", shape: "circle", size: 10, color: "#ff0000" },
  { id: "n2", title: "Node 2", shape: "square", size: 12, color: "#00ff00" },
  { id: "n3", title: "Node 3", shape: "circle", size: 8, color: "#0000ff" },
];

const testEdges = [
  { id: "e1", source_id: "n1", target_id: "n2", relation_type: "leads_to" },
  { id: "e2", source_id: "n2", target_id: "n3", relation_type: "extends" },
  { id: "e-dangling", source_id: "n1", target_id: "nonexistent", relation_type: "ghost" },
];

const testClusters = [
  { cluster_id: 0, node_ids: ["n1", "n2"] },
  { cluster_id: 1, node_ids: ["n3"] },
];

describe("GraphCanvas", () => {
  it("renders an svg element containing graph nodes", () => {
    const { container } = render(
      <GraphCanvas nodes={testNodes} edges={testEdges} onNodeClick={vi.fn()} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders circles for circle-shaped nodes and rects for square-shaped nodes", () => {
    const { container } = render(
      <GraphCanvas nodes={testNodes} edges={testEdges} onNodeClick={vi.fn()} />
    );
    const circles = container.querySelectorAll("circle");
    const rects = container.querySelectorAll("rect");
    expect(circles.length).toBeGreaterThanOrEqual(2);
    expect(rects.length).toBeGreaterThanOrEqual(1);
  });

  it("renders lines for valid edges and ignores dangling edges", () => {
    const { container } = render(
      <GraphCanvas nodes={testNodes} edges={testEdges} onNodeClick={vi.fn()} />
    );
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBe(2);
  });

  it("renders title text labels for each node", () => {
    const { container } = render(
      <GraphCanvas nodes={testNodes} edges={testEdges} onNodeClick={vi.fn()} />
    );
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts).toContain("Node 1");
    expect(texts).toContain("Node 2");
    expect(texts).toContain("Node 3");
  });

  it("calls onNodeClick with the clicked node's id", () => {
    const onNodeClick = vi.fn();
    const { container } = render(
      <GraphCanvas nodes={testNodes} edges={testEdges} onNodeClick={onNodeClick} />
    );
    const nodeGroup = container.querySelector("g[cursor='grab']");
    expect(nodeGroup).toBeInTheDocument();
    fireEvent.click(nodeGroup);
    expect(onNodeClick).toHaveBeenCalledWith("n1");
  });

  it("renders cluster hull paths when clusters are provided", () => {
    const { container } = render(
      <GraphCanvas
        nodes={testNodes}
        edges={testEdges}
        clusters={testClusters}
        onNodeClick={vi.fn()}
      />
    );
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it("uses the backend's semantic cluster label when present, instead of the numeric fallback", () => {
    const clusters = [
      { cluster_id: 0, node_ids: ["n1", "n2"], label: "Auth flow" },
      { cluster_id: 1, node_ids: ["n3"], label: null },
    ];
    const { container } = render(
      <GraphCanvas
        nodes={testNodes}
        edges={testEdges}
        clusters={clusters}
        onNodeClick={vi.fn()}
      />
    );

    const hullLabels = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(hullLabels).toContain("Auth flow");
    expect(hullLabels).toContain("Cụm 1");
    expect(hullLabels).not.toContain("Cụm 0");
  });

  it("renders cleanly with empty nodes and edges arrays", () => {
    const { container } = render(
      <GraphCanvas nodes={[]} edges={[]} onNodeClick={vi.fn()} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(container.querySelectorAll("circle").length).toBe(0);
    expect(container.querySelectorAll("line").length).toBe(0);
  });

  it("updates node and edge elements on props re-render", () => {
    const { container, rerender } = render(
      <GraphCanvas nodes={testNodes} edges={testEdges} onNodeClick={vi.fn()} />
    );
    expect(container.querySelectorAll("circle").length).toBeGreaterThanOrEqual(2);

    rerender(
      <GraphCanvas
        nodes={[{ id: "n1", title: "Single", shape: "circle", size: 10 }]}
        edges={[]}
        onNodeClick={vi.fn()}
      />
    );
    expect(container.querySelectorAll("text").length).toBe(1);
    expect(container.querySelector("text").textContent).toBe("Single");
  });

  it("unmounts cleanly without errors", () => {
    const { unmount } = render(
      <GraphCanvas nodes={testNodes} edges={testEdges} onNodeClick={vi.fn()} />
    );
    expect(() => unmount()).not.toThrow();
  });
});
