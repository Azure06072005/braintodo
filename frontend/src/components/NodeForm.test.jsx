import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NodeForm from "./NodeForm";

describe("NodeForm", () => {
  it("create mode: submits title/content/tags/weight/color/shape/size shaped for NodeCreate", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<NodeForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/tiêu đề/i), "  My idea  ");
    await user.type(screen.getByLabelText(/nội dung/i), "some content");
    await user.type(screen.getByLabelText(/tags/i), "a, b ,c");
    await user.clear(screen.getByLabelText(/trọng số/i));
    await user.type(screen.getByLabelText(/trọng số/i), "2.5");
    await user.clear(screen.getByLabelText(/kích thước/i));
    await user.type(screen.getByLabelText(/kích thước/i), "18");
    await user.click(screen.getByRole("button", { name: /tạo ý tưởng/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    // Title is trimmed; tags is split on commas, each trimmed, empties dropped.
    expect(payload.title).toBe("My idea");
    expect(payload.content).toBe("some content");
    expect(payload.tags).toEqual(["a", "b", "c"]);
    // weight/size are coerced to numbers - NodeCreate requires float/float,
    // not the raw string an <input> produces. Typed values (not the
    // untouched numeric defaults) so a missing Number() call would actually
    // surface as a string here rather than passing by coincidence.
    expect(payload.weight).toBe(2.5);
    expect(payload.size).toBe(18);
    expect(typeof payload.weight).toBe("number");
    expect(typeof payload.size).toBe("number");
  });

  it("edit mode: pre-fills from `initial`, joining the tags array into a comma string", () => {
    render(
      <NodeForm
        mode="edit"
        initial={{
          title: "Existing",
          content: "existing content",
          tags: ["x", "y"],
          weight: 2.5,
          color: "#123456",
          shape: "square",
          size: 20,
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/tiêu đề/i)).toHaveValue("Existing");
    expect(screen.getByLabelText(/nội dung/i)).toHaveValue("existing content");
    expect(screen.getByLabelText(/tags/i)).toHaveValue("x, y");
    expect(screen.getByRole("button", { name: /lưu thay đổi/i })).toBeInTheDocument();
  });

  it("rejects an empty title without calling onSubmit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<NodeForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /tạo ý tưởng/i }));

    expect(await screen.findByText(/không được để trống/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces onSubmit's rejection (e.g. a real backend error) instead of swallowing it", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<NodeForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText(/tiêu đề/i), "Idea");
    await user.click(screen.getByRole("button", { name: /tạo ý tưởng/i }));

    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("calls onCancel when Huỷ is clicked, without calling onSubmit", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<NodeForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: /huỷ/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});