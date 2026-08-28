import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import GraphCanvas3D from "./GraphCanvas3D";

const nodes = [
  { id: "n1", title: "A", color: "#ff0000", size: 10 },
  { id: "n2", title: "B", color: "#00ff00", size: 10 },
  { id: "n3", title: "C", color: "#0000ff", size: 10 },
];
const edges = [
  { id: "e1", source_id: "n1", target_id: "n2" },
  { id: "e2", source_id: "n2", target_id: "n3" },
];

describe("GraphCanvas3D", () => {
  it("renders its container without crashing, even with no real WebGL context (jsdom)", () => {
    const { getByTestId } = render(
      <GraphCanvas3D nodes={nodes} edges={edges} onNodeClick={() => {}} selectedNodeId={null} clusters={null} />
    );
    expect(getByTestId("graph-canvas-3d")).toBeInTheDocument();
  });

  it("renders with an empty graph without crashing", () => {
    const { getByTestId } = render(
      <GraphCanvas3D nodes={[]} edges={[]} onNodeClick={() => {}} selectedNodeId={null} clusters={null} />
    );
    expect(getByTestId("graph-canvas-3d")).toBeInTheDocument();
  });

  it("renders with clusters provided without crashing", () => {
    const clusters = [
      { cluster_id: 0, node_ids: ["n1", "n2"], label: "Group A" },
      { cluster_id: 1, node_ids: ["n3"], label: null },
    ];
    const { getByTestId } = render(
      <GraphCanvas3D nodes={nodes} edges={edges} onNodeClick={() => {}} selectedNodeId="n1" clusters={clusters} />
    );
    expect(getByTestId("graph-canvas-3d")).toBeInTheDocument();
  });

  it("mounts and unmounts cleanly (no leaked listeners/renderer errors)", () => {
    const { unmount } = render(
      <GraphCanvas3D nodes={nodes} edges={edges} onNodeClick={() => {}} selectedNodeId={null} clusters={null} />
    );
    expect(() => unmount()).not.toThrow();
  });

  it("re-renders without throwing when the node/edge lists change", () => {
    const { rerender } = render(
      <GraphCanvas3D nodes={nodes} edges={edges} onNodeClick={() => {}} selectedNodeId={null} clusters={null} />
    );
    const moreNodes = [...nodes, { id: "n4", title: "D", color: "#ffffff", size: 8 }];
    expect(() =>
      rerender(
        <GraphCanvas3D nodes={moreNodes} edges={edges} onNodeClick={() => {}} selectedNodeId="n4" clusters={null} />
      )
    ).not.toThrow();
  });

  it("tolerates edges referencing ids not present in nodes (dangling edge)", () => {
    const danglingEdges = [{ id: "e1", source_id: "n1", target_id: "does-not-exist" }];
    const { getByTestId } = render(
      <GraphCanvas3D nodes={nodes} edges={danglingEdges} onNodeClick={() => {}} selectedNodeId={null} clusters={null} />
    );
    expect(getByTestId("graph-canvas-3d")).toBeInTheDocument();
  });
});