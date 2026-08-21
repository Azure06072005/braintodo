import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NodeDetailPanel from "./NodeDetailPanel";

const baseNode = {
  id: "n1",
  title: "Neural networks",
  content: "Some content",
  tags: ["ml", "gnn"],
  weight: 1.5,
  color: "#4287f5",
  shape: "circle",
  size: 12,
  embedding: [0.1, 0.2, 0.3],
  graph_embedding: null,
};

const clusters = [{ cluster_id: 2, node_ids: ["n1", "n2"] }];
const linkSuggestions = [
  { source_id: "n1", target_id: "n2", score: 0.71 },
  { source_id: "n3", target_id: "n1", score: 0.5 },
];
const allNodesById = new Map([
  ["n1", baseNode],
  ["n2", { id: "n2", title: "Backpropagation" }],
  ["n3", { id: "n3", title: "Gradient descent" }],
]);

describe("NodeDetailPanel", () => {
  it("shows a placeholder message and no node detail when node is null", () => {
    render(
      <NodeDetailPanel
        node={null}
        clusters={[]}
        linkSuggestions={[]}
        allNodesById={new Map()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        topology={null}
        panelOpen={false}
        onClosePanel={vi.fn()}
      />
    );
    expect(screen.getByText(/chọn một node/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa" })).not.toBeInTheDocument();
  });

  it("renders the node's title, content, tags, and visual/embedding properties", () => {
    render(
      <NodeDetailPanel
        node={baseNode}
        clusters={clusters}
        linkSuggestions={linkSuggestions}
        allNodesById={allNodesById}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        topology={null}
        panelOpen={true}
        onClosePanel={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Neural networks" })).toBeInTheDocument();
    expect(screen.getByText("Some content")).toBeInTheDocument();
    expect(screen.getByText("ml")).toBeInTheDocument();
    expect(screen.getByText("gnn")).toBeInTheDocument();
    // Text embedding present (3-d), graph embedding absent.
    expect(screen.getByText("có (3-d)")).toBeInTheDocument();
    expect(screen.getByText("chưa có")).toBeInTheDocument();
    // Belongs to cluster 2.
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("falls back to placeholder text for empty content and no tags", () => {
    render(
      <NodeDetailPanel
        node={{ ...baseNode, content: "", tags: [] }}
        clusters={[]}
        linkSuggestions={[]}
        allNodesById={allNodesById}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        topology={null}
        panelOpen={true}
        onClosePanel={vi.fn()}
      />
    );
    expect(screen.getByText("(chưa có nội dung)")).toBeInTheDocument();
    expect(screen.getByText("Không có tag")).toBeInTheDocument();
    expect(screen.getByText(/chưa thuộc cụm nào/i)).toBeInTheDocument();
  });

  it("shows both related link suggestions regardless of which side the node is on", () => {
    render(
      <NodeDetailPanel
        node={baseNode}
        clusters={clusters}
        linkSuggestions={linkSuggestions}
        allNodesById={allNodesById}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        topology={null}
        panelOpen={true}
        onClosePanel={vi.fn()}
      />
    );
    // n1->n2 (n1 is source) and n3->n1 (n1 is target) both show the OTHER node's title.
    expect(screen.getByText("Backpropagation")).toBeInTheDocument();
    expect(screen.getByText("Gradient descent")).toBeInTheDocument();
    expect(screen.getByText("(score 0.71)")).toBeInTheDocument();
  });

  it("shows topology metrics when a topology Map entry exists for the node", () => {
    const topology = new Map([
      ["n1", { degree: 3, degree_centrality: 0.428, betweenness_centrality: 0.1, pagerank: 0.256 }],
    ]);
    render(
      <NodeDetailPanel
        node={baseNode}
        clusters={clusters}
        linkSuggestions={[]}
        allNodesById={allNodesById}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        topology={topology}
        panelOpen={true}
        onClosePanel={vi.fn()}
      />
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("0.428")).toBeInTheDocument();
    expect(screen.getByText("0.256")).toBeInTheDocument();
  });

  it("calls onEdit/onDelete/onClosePanel with the right arguments", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onClosePanel = vi.fn();
    const user = userEvent.setup();

    render(
      <NodeDetailPanel
        node={baseNode}
        clusters={[]}
        linkSuggestions={[]}
        allNodesById={allNodesById}
        onEdit={onEdit}
        onDelete={onDelete}
        topology={null}
        panelOpen={true}
        onClosePanel={onClosePanel}
      />
    );

    await user.click(screen.getByRole("button", { name: "Sửa" }));
    expect(onEdit).toHaveBeenCalledWith(baseNode);

    await user.click(screen.getByRole("button", { name: "Xoá" }));
    expect(onDelete).toHaveBeenCalledWith(baseNode);

    await user.click(screen.getByRole("button", { name: /đóng/i }));
    expect(onClosePanel).toHaveBeenCalledTimes(1);
  });
});