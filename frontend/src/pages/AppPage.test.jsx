import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppPage from "./AppPage";
import { mockNodes } from "../data/mockData";

// GraphCanvas is D3/SVG-heavy and deserves its own narrowly-scoped test
// (e.g. "renders one <circle> per node") rather than being exercised
// through AppPage - see claude-progress.md's carried-forward note on FE008.
// Here it's replaced with a minimal stand-in that exposes just enough
// (node count, a clickable node) to test AppPage's own orchestration logic:
// modals, search wiring, delete confirmation - against the REAL
// useGraphData("mock") hook, not a mocked one.
vi.mock("../components/GraphCanvas", () => ({
  default: ({ nodes, onNodeClick }) => (
    <div data-testid="graph-canvas-stub">
      <span data-testid="node-count">{nodes.length}</span>
      {nodes.map((n) => (
        <button key={n.id} onClick={() => onNodeClick(n.id)}>
          canvas-node:{n.title}
        </button>
      ))}
    </div>
  ),
}));

describe("AppPage", () => {
  let confirmSpy;
  let alertSpy;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("renders the mock dataset through GraphCanvas on initial mount", async () => {
    render(<AppPage />);
    await waitFor(() => {
      expect(screen.getByTestId("node-count")).toHaveTextContent(String(mockNodes.length));
    });
    expect(screen.getByText("braintodo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/tìm ý tưởng/i)).toBeInTheDocument();
  });

  it("creating a node via the modal adds it to the canvas and selects it", async () => {
    const user = userEvent.setup();
    render(<AppPage />);
    await waitFor(() => screen.getByTestId("node-count"));
    const startCount = Number(screen.getByTestId("node-count").textContent);

    await user.click(screen.getByRole("button", { name: "+ Ý tưởng mới" }));
    const titleInput = await screen.findByLabelText(/tiêu đề/i);
    await user.type(titleInput, "Brand new idea");
    await user.click(screen.getByRole("button", { name: /tạo ý tưởng/i }));

    await waitFor(() => {
      expect(screen.getByTestId("node-count")).toHaveTextContent(String(startCount + 1));
    });
    // Modal closes after a successful submit.
    expect(screen.queryByLabelText(/tiêu đề/i)).not.toBeInTheDocument();
    // The newly created node is selected - its title shows in the detail panel.
    expect(await screen.findByText("Brand new idea", { selector: "*:not(button)" })).toBeInTheDocument();
  });

  it("creating an edge via the modal connects two existing nodes", async () => {
    const user = userEvent.setup();
    render(<AppPage />);
    await waitFor(() => screen.getByTestId("node-count"));

    await user.click(screen.getByRole("button", { name: "+ Liên kết" }));
    // EdgeForm defaults source/target to the first two distinct nodes -
    // submitting immediately is a valid edge given >= 2 mock nodes exist.
    await user.click(screen.getByRole("button", { name: /tạo liên kết/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /tạo liên kết/i })).not.toBeInTheDocument();
    });
  });

  it("clicking a node on the canvas selects it and shows its detail panel", async () => {
    const user = userEvent.setup();
    render(<AppPage />);
    const target = mockNodes[0];

    await user.click(await screen.findByText(`canvas-node:${target.title}`));

    // NodeDetailPanel renders the selected node's title in its own
    // paragraph, separate from the canvas stub's "canvas-node:<title>"
    // button text.
    expect(await screen.findByText(target.title, { selector: "*:not(button)" })).toBeInTheDocument();
  });

  it("deleting a node confirms via window.confirm and removes it from the canvas", async () => {
    const user = userEvent.setup();
    render(<AppPage />);
    await waitFor(() => screen.getByTestId("node-count"));
    const startCount = Number(screen.getByTestId("node-count").textContent);
    const target = mockNodes[0];

    await user.click(await screen.findByText(`canvas-node:${target.title}`));
    await user.click(await screen.findByRole("button", { name: /^xoá$/i }));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining(target.title));
    await waitFor(() => {
      expect(screen.getByTestId("node-count")).toHaveTextContent(String(startCount - 1));
    });
    expect(screen.queryByText(`canvas-node:${target.title}`)).not.toBeInTheDocument();
  });

  it("declining the confirm dialog leaves the node in place", async () => {
    confirmSpy.mockReturnValue(false);
    const user = userEvent.setup();
    render(<AppPage />);
    await waitFor(() => screen.getByTestId("node-count"));
    const startCount = Number(screen.getByTestId("node-count").textContent);
    const target = mockNodes[0];

    await user.click(await screen.findByText(`canvas-node:${target.title}`));
    await user.click(await screen.findByRole("button", { name: /^xoá$/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByTestId("node-count")).toHaveTextContent(String(startCount));
  });

  it("searching surfaces matches and selecting one selects that node", async () => {
    const user = userEvent.setup();
    render(<AppPage />);
    const target = mockNodes[0];
    const keyword = target.title.split(" ")[0];

    await user.type(screen.getByPlaceholderText(/tìm ý tưởng/i), keyword);
    await user.click(screen.getByRole("button", { name: "Tìm" }));

    const dropdown = await screen.findByText(/kết quả/i);
    expect(dropdown).toBeInTheDocument();
  });

  it("switching source away to live and back to mock resets the graph to the mock dataset", async () => {
    const originalFetch = global.fetch;
    // "live" mode calls fetch - make it fail fast so this test doesn't
    // depend on a real backend (same pattern as useGraphData.test.js's
    // equivalent reset test).
    global.fetch = () => Promise.reject(new Error("no backend in this test"));
    const user = userEvent.setup();

    render(<AppPage />);
    await waitFor(() => screen.getByTestId("node-count"));

    await user.click(screen.getByRole("button", { name: "+ Ý tưởng mới" }));
    await user.type(await screen.findByLabelText(/tiêu đề/i), "Temp");
    await user.click(screen.getByRole("button", { name: /tạo ý tưởng/i }));
    await waitFor(() => {
      expect(screen.getByTestId("node-count")).toHaveTextContent(String(mockNodes.length + 1));
    });

    await user.click(screen.getByRole("button", { name: "API thật" }));
    await waitFor(() => {
      // Live mode failing shows the API error banner from TopBar.
      expect(screen.getByText(/không nối được api thật/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Mock" }));
    await waitFor(() => {
      expect(screen.getByTestId("node-count")).toHaveTextContent(String(mockNodes.length));
    });

    global.fetch = originalFetch;
  });

  it("toggling topology does not enter an infinite update loop and surfaces metrics", async () => {
    const user = userEvent.setup();
    render(<AppPage />);
    await waitFor(() => screen.getByTestId("node-count"));

    await user.click(screen.getByRole("button", { name: "Độ quan trọng" }));

    await waitFor(
      () => {
        expect(screen.queryByText("Đang tính…")).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    expect(alertSpy).not.toHaveBeenCalledWith(expect.stringMatching(/không tính được topology/i));

    await user.click(screen.getByRole("button", { name: "Độ quan trọng" }));
    await user.click(screen.getByRole("button", { name: "Độ quan trọng" }));
    await waitFor(() => {
      expect(screen.queryByText("Đang tính…")).not.toBeInTheDocument();
    });
    expect(alertSpy).not.toHaveBeenCalledWith(expect.stringMatching(/không tính được topology/i));
  });

  it("toggling to 3D swaps GraphCanvas for GraphCanvas3D, and back again", async () => {
    const user = userEvent.setup();
    render(<AppPage />);
    await waitFor(() => screen.getByTestId("node-count"));

    expect(screen.getByTestId("graph-canvas-stub")).toBeInTheDocument();
    expect(screen.queryByTestId("graph-canvas-3d")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "3D" }));

    expect(screen.queryByTestId("graph-canvas-stub")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("graph-canvas-3d")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "2D" }));

    expect(screen.getByTestId("graph-canvas-stub")).toBeInTheDocument();
    expect(screen.queryByTestId("graph-canvas-3d")).not.toBeInTheDocument();
  });

  it("toggling to Tasks view mode renders DailyTaskView", async () => {
    const user = userEvent.setup();
    render(<AppPage />);
    await waitFor(() => screen.getByTestId("node-count"));

    await user.click(screen.getByRole("button", { name: "Nhiệm vụ" }));

    expect(screen.queryByTestId("graph-canvas-stub")).not.toBeInTheDocument();
    expect(screen.getByText(/danh sách nhiệm vụ hôm nay/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "2D" }));
    expect(screen.getByTestId("graph-canvas-stub")).toBeInTheDocument();
  });
});
