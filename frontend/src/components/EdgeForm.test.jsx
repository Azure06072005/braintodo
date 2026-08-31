import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EdgeForm from "./EdgeForm";
import { I18nProvider } from "../i18n/I18nContext";

const nodes = [
  { id: "n1", title: "Node One" },
  { id: "n2", title: "Node Two" },
  { id: "n3", title: "Node Three" },
];

describe("EdgeForm", () => {
  it("submits source_id/target_id/relation_type/style shaped for EdgeCreate", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<EdgeForm nodes={nodes} defaultSourceId="n1" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /tạo liên kết/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({
      source_id: "n1",
      target_id: "n2", // first node that isn't the default source
      relation_type: "related_to",
      color: "#999999",
      style: "solid",
    });
  });

  it("respects a custom relation_type and style", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<EdgeForm nodes={nodes} defaultSourceId="n1" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.clear(screen.getByLabelText(/loại quan hệ/i));
    await user.type(screen.getByLabelText(/loại quan hệ/i), "extends");
    await user.selectOptions(screen.getByLabelText(/kiểu nét vẽ/i), "dashed");
    await user.click(screen.getByRole("button", { name: /tạo liên kết/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      relation_type: "extends",
      style: "dashed",
    });
  });

  it("rejects source === target without calling onSubmit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<EdgeForm nodes={nodes} defaultSourceId="n1" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText(/đến node/i), "n1");
    await user.click(screen.getByRole("button", { name: /tạo liên kết/i }));

    expect(await screen.findByText(/phải khác nhau/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a message and no form when fewer than 2 nodes are available (mirrors real empty/single-node graphs)", () => {
    render(<EdgeForm nodes={[nodes[0]]} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(/cần ít nhất 2 node/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tạo liên kết/i })).not.toBeInTheDocument();
  });

  it("calls onCancel when Huỷ is clicked, without calling onSubmit", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<EdgeForm nodes={nodes} onSubmit={onSubmit} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: /huỷ/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders in English when mounted under an I18nProvider set to 'en'", () => {
    localStorage.setItem("bt-locale", "en");
    render(
      <I18nProvider>
        <EdgeForm nodes={nodes} defaultSourceId="n1" onSubmit={vi.fn()} onCancel={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByLabelText(/from node/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    localStorage.removeItem("bt-locale");
  });
});