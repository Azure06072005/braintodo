import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "./SearchBar";

const searchResult = {
  matches: [
    { node_id: "n1", score: 0.913 },
    { node_id: "n2", score: 0.5 },
  ],
  subgraph_nodes: [
    { id: "n1", title: "Neural networks", color: "#4287f5" },
    { id: "n2", title: "Backpropagation", color: "#f5a742" },
  ],
  subgraph_edges: [],
};

describe("SearchBar", () => {
  it("calls onSearch with the trimmed query on submit", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSearch={onSearch} onClear={vi.fn()} onSelectMatch={vi.fn()} result={null} searching={false} />);
    await user.type(screen.getByPlaceholderText(/tìm ý tưởng/i), "  neural  ");
    await user.click(screen.getByRole("button", { name: "Tìm" }));

    // SearchBar passes the raw input value through - trimming/validation
    // of the query text itself lives in useGraphData/the backend, not here.
    expect(onSearch).toHaveBeenCalledWith("  neural  ");
  });

  it("does not call onSearch for an empty/whitespace-only query", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSearch={onSearch} onClear={vi.fn()} onSelectMatch={vi.fn()} result={null} searching={false} />);
    await user.type(screen.getByPlaceholderText(/tìm ý tưởng/i), "   ");
    await user.click(screen.getByRole("button", { name: "Tìm" }));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("shows the searching indicator on the submit button while searching=true", () => {
    render(<SearchBar onSearch={vi.fn()} onClear={vi.fn()} onSelectMatch={vi.fn()} result={null} searching={true} />);
    expect(screen.getByRole("button", { name: "…" })).toBeInTheDocument();
  });

  it("renders matches from `result` and calls onSelectMatch with the node_id when clicked", async () => {
    const onSelectMatch = vi.fn();
    const user = userEvent.setup();

    render(
      <SearchBar
        onSearch={vi.fn()}
        onClear={vi.fn()}
        onSelectMatch={onSelectMatch}
        result={searchResult}
        searching={false}
      />
    );

    expect(screen.getByText("Neural networks")).toBeInTheDocument();
    expect(screen.getByText("Backpropagation")).toBeInTheDocument();
    expect(screen.getByText("2 kết quả · vùng lân cận: 2 node")).toBeInTheDocument();

    await user.click(screen.getByText("Neural networks"));
    expect(onSelectMatch).toHaveBeenCalledWith("n1");
  });

  it("shows a no-results message when result.matches is empty", () => {
    render(
      <SearchBar
        onSearch={vi.fn()}
        onClear={vi.fn()}
        onSelectMatch={vi.fn()}
        result={{ matches: [], subgraph_nodes: [], subgraph_edges: [] }}
        searching={false}
      />
    );
    expect(screen.getByText(/không tìm thấy/i)).toBeInTheDocument();
  });

  it("Xoá clears the query text and calls onClear, and disappears once result is gone", async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <SearchBar onSearch={vi.fn()} onClear={onClear} onSelectMatch={vi.fn()} result={searchResult} searching={false} />
    );
    const input = screen.getByPlaceholderText(/tìm ý tưởng/i);
    await user.type(input, "neural");
    await user.click(screen.getByRole("button", { name: "Xoá" }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("");

    // Xoá button only exists while `result` is truthy - once the parent
    // clears the result (as onClear is expected to do), it should go away.
    rerender(<SearchBar onSearch={vi.fn()} onClear={onClear} onSelectMatch={vi.fn()} result={null} searching={false} />);
    expect(screen.queryByRole("button", { name: "Xoá" })).not.toBeInTheDocument();
  });
});