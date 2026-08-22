import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import GraphCanvas from "./GraphCanvas";

/**
 * GraphCanvas drives a D3 force simulation directly against the DOM (no
 * React-rendered children per node/edge), so testing-library's screen
 * queries don't apply the way they do elsewhere. Per the scoping decision
 * (see Decisions.md), these tests stick to structural SVG assertions -
 * element counts, shapes, click wiring - and deliberately do NOT assert on
 * simulated positions, zoom behavior, or drag interaction. The force
 * simulation's tick callback updates x/y asynchronously over many frames;
 * nothing here depends on ticks having run, since node/edge/cluster DOM
 * elements are created synchronously during the effect, before any tick
 * fires.
 *
 * The click test uses `fireEvent.click` rather than `userEvent.click`:
 * GraphCanvas wires d3's drag/zoom behavior to `mousedown`, and
 * `userEvent.click` dispatches a full pointerdown/mousedown/mouseup/click
 * sequence - which would exercise d3-drag's dragstart handler and hit a
 * jsdom gap (synthetic MouseEvents there don't set `.view`, which
 * `d3-drag`'s dragstart handler dereferences). `fireEvent.click` dispatches
 * a single `click` event, which is all that's needed to exercise the
 * `.on("click", ...)` handler under test here.
 */
const nodes = [
  { id: "n1", title: "Node One", color: "#4287f5", shape: "circle", size: 12 },
  { id: "n2", title: "Node Two", color: "#f5a742", shape: "circle", size: 10 },
  { id: "n3", title: "Node Three", color: "#42f587", shape: "square", size: 14 },
];

const edges = [
  { id: "e1", source_id: "n1", target_id: "n2", color: "#999", style: "solid" },
  { id: "e2", source_id: "n2", target_id: "n3", color: "#999", style: "dashed" },
];

function renderCanvas(props = {}) {
  return render(
    <GraphCanvas
      nodes={nodes}
      edges={edges}
      onNodeClick={vi.fn()}
      selectedNodeId={null}
      highlightNodeIds={null}
      matchNodeIds={null}
      topology={null}
      clusters={null}
      {...props}
    />
  );
}

function nodeCircles(container) {
  // Node shapes live inside the draggable per-node <g cursor="grab">;
  // pulse-animation dots (one <circle> per edge, for the moving-dot
  // effect) are appended earlier as direct children of their own <g> and
  // would otherwise be indistinguishable from circle-shaped nodes.
  return container.querySelectorAll('g[cursor="grab"] > circle');
}
function nodeRects(container) {
  return container.querySelectorAll('g[cursor="grab"] > rect');
}

describe("GraphCanvas", () => {
  it("renders one shape element per node - circle or rect per each node's `shape`", () => {
    const { container } = renderCanvas();
    // n1, n2 are circles; n3 is a square (rect).
    expect(nodeCircles(container).length).toBe(2);
    expect(nodeRects(container).length).toBe(1);
  });

  it("renders one <line> per edge whose endpoints both exist in `nodes`", () => {
    const { container } = renderCanvas();
    expect(container.querySelectorAll("line").length).toBe(2);
  });

  it("silently drops an edge that references a node not present in `nodes`", () => {
    const { container } = renderCanvas({
      edges: [...edges, { id: "e3", source_id: "n1", target_id: "does-not-exist" }],
    });
    // Still 2, not 3 - the dangling edge is filtered out before rendering,
    // matching the backend's own "missing node -> reject" behavior rather
    // than crashing or drawing a line to nowhere.
    expect(container.querySelectorAll("line").length).toBe(2);
  });

  it("renders a text label with each node's title", () => {
    const { container } = renderCanvas();
    const labels = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(labels).toContain("Node One");
    expect(labels).toContain("Node Two");
    expect(labels).toContain("Node Three");
  });

  it("clicking a node's shape calls onNodeClick with that node's id", () => {
    const onNodeClick = vi.fn();
    const { container } = renderCanvas({ onNodeClick });

    // Shapes are appended in `nodes` order: n1, n2 (circles), then n3 (rect).
    const firstCircle = nodeCircles(container)[0];
    fireEvent.click(firstCircle);

    expect(onNodeClick).toHaveBeenCalledWith("n1");
  });

  it("renders no cluster hulls when clusters is null", () => {
    const { container } = renderCanvas({ clusters: null });
    expect(container.querySelectorAll("path").length).toBe(0);
  });

  it("renders one hull <path> and one label per cluster when clusters is provided", () => {
    const clusters = [
      { cluster_id: 0, node_ids: ["n1", "n2"] },
      { cluster_id: 1, node_ids: ["n3"] },
    ];
    const { container } = renderCanvas({ clusters });

    expect(container.querySelectorAll("path").length).toBe(2);
    const hullLabels = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(hullLabels).toContain("Cụm 0");
    expect(hullLabels).toContain("Cụm 1");
  });

  it("re-renders without throwing when the node/edge lists change", () => {
    const { rerender, container } = renderCanvas();
    expect(nodeCircles(container).length + nodeRects(container).length).toBe(3);

    rerender(
      <GraphCanvas
        nodes={[nodes[0]]}
        edges={[]}
        onNodeClick={vi.fn()}
        selectedNodeId={null}
        highlightNodeIds={null}
        matchNodeIds={null}
        topology={null}
        clusters={null}
      />
    );
    expect(nodeCircles(container).length + nodeRects(container).length).toBe(1);
    expect(container.querySelectorAll("line").length).toBe(0);
  });

  it("unmounts cleanly (stops the force simulation and pulse timer without error)", () => {
    const { unmount } = renderCanvas();
    expect(() => unmount()).not.toThrow();
  });
});
