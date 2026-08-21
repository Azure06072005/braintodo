import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportExportControls from "./ImportExportControls";

describe("ImportExportControls", () => {
  let clickSpy;

  beforeEach(() => {
    // jsdom implements URL.createObjectURL but anchor.click() would try to
    // navigate - spy on it so the test doesn't actually attempt that, while
    // still letting us assert a download was triggered.
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it("Xuất JSON calls onExport and triggers a file download", async () => {
    const onExport = vi.fn().mockResolvedValue({ nodes: [{ id: "n1" }], edges: [] });
    const user = userEvent.setup();

    render(<ImportExportControls onExport={onExport} onImport={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Xuất JSON" }));

    await waitFor(() => {
      expect(onExport).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("shows an error message when export fails, without crashing", async () => {
    const onExport = vi.fn().mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<ImportExportControls onExport={onExport} onImport={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Xuất JSON" }));

    expect(await screen.findByText(/xuất thất bại: network error/i)).toBeInTheDocument();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("importing a valid JSON file calls onImport with the parsed data and shows a summary", async () => {
    const onImport = vi.fn().mockResolvedValue({ nodes_created: 2, edges_created: 1, edges_skipped: 0 });
    const user = userEvent.setup();

    const { container } = render(<ImportExportControls onExport={vi.fn()} onImport={onImport} />);
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(
      [JSON.stringify({ nodes: [{ id: "old-1", title: "A" }], edges: [] })],
      "graph.json",
      { type: "application/json" }
    );

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith({ nodes: [{ id: "old-1", title: "A" }], edges: [] });
    });
    expect(await screen.findByText("Đã nhập 2 node, 1 liên kết")).toBeInTheDocument();
  });

  it("shows the skipped-edges count in the summary when edges_skipped > 0", async () => {
    const onImport = vi.fn().mockResolvedValue({ nodes_created: 2, edges_created: 1, edges_skipped: 1 });
    const user = userEvent.setup();

    const { container } = render(<ImportExportControls onExport={vi.fn()} onImport={onImport} />);
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File([JSON.stringify({ nodes: [], edges: [] })], "graph.json", {
      type: "application/json",
    });

    await user.upload(fileInput, file);

    expect(
      await screen.findByText("Đã nhập 2 node, 1 liên kết (bỏ qua 1 liên kết lỗi)")
    ).toBeInTheDocument();
  });

  it("shows an error message for a malformed JSON file, without calling onImport", async () => {
    const onImport = vi.fn();
    const user = userEvent.setup();

    const { container } = render(<ImportExportControls onExport={vi.fn()} onImport={onImport} />);
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(["not valid json {{{"], "graph.json", { type: "application/json" });

    await user.upload(fileInput, file);

    expect(await screen.findByText(/nhập thất bại/i)).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });

  it("disables both buttons while an export/import is in flight", async () => {
    let resolveExport;
    const onExport = vi.fn(() => new Promise((resolve) => { resolveExport = resolve; }));
    const user = userEvent.setup();

    render(<ImportExportControls onExport={onExport} onImport={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Xuất JSON" }));

    expect(screen.getByRole("button", { name: "Xuất JSON" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /nhập json|đang xử lý/i })).toBeDisabled();

    resolveExport({ nodes: [], edges: [] });
    await waitFor(() => expect(screen.getByRole("button", { name: "Xuất JSON" })).not.toBeDisabled());
  });
});