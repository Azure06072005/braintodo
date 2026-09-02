import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DailyTaskView from "./DailyTaskView";
import { formatDuration } from "../tasks/format";

const sampleTasks = [
  {
    id: "t1",
    title: "Urgent bug fix",
    node_type: "task",
    priority: "high",
    due_date: "2026-06-10",
    recurrence_rule: "daily",
    completed_at: null,
  },
  {
    id: "t2",
    title: "Write documentation",
    node_type: "task",
    priority: "low",
    due_date: "2026-06-15",
    completed_at: "2026-06-10T12:00:00Z",
  },
];

describe("formatDuration", () => {
  it("formats seconds into human readable string", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(120)).toBe("2m");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(3750)).toBe("1h 2m");
  });
});

describe("DailyTaskView", () => {
  it("renders summary strip from fetchSummary and task list", async () => {
    const fetchSummary = vi.fn().mockResolvedValue({
      date: "2026-06-10",
      created: 3,
      completed: 2,
      overdue: 1,
      avg_completion_seconds: 3600,
    });
    const onSelectNode = vi.fn();
    const onCompleteNode = vi.fn();

    render(
      <DailyTaskView
        tasks={sampleTasks}
        fetchSummary={fetchSummary}
        onCompleteNode={onCompleteNode}
        onReopenNode={vi.fn()}
        onSelectNode={onSelectNode}
        selectedNodeId={null}
      />
    );

    await waitFor(() => expect(fetchSummary).toHaveBeenCalled());
    expect(screen.getByText("Urgent bug fix")).toBeInTheDocument();
    expect(screen.getByText("Write documentation")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // created
    expect(screen.getByText("2")).toBeInTheDocument(); // completed
    expect(screen.getByText("1")).toBeInTheDocument(); // overdue
    expect(screen.getByText("1h")).toBeInTheDocument(); // avg_completion_seconds
  });

  it("triggers onCompleteNode and onSelectNode on interaction", async () => {
    const fetchSummary = vi.fn().mockResolvedValue({
      date: "2026-06-10",
      created: 0,
      completed: 0,
      overdue: 0,
      avg_completion_seconds: null,
    });
    const onCompleteNode = vi.fn();
    const onSelectNode = vi.fn();
    const user = userEvent.setup();

    render(
      <DailyTaskView
        tasks={sampleTasks}
        fetchSummary={fetchSummary}
        onCompleteNode={onCompleteNode}
        onReopenNode={vi.fn()}
        onSelectNode={onSelectNode}
        selectedNodeId={null}
      />
    );

    await user.click(screen.getByText("Urgent bug fix"));
    expect(onSelectNode).toHaveBeenCalledWith(sampleTasks[0]);

    const completeBtn = screen.getByRole("button", { name: /hoàn thành urgent bug fix/i });
    await user.click(completeBtn);
    expect(onCompleteNode).toHaveBeenCalledWith(sampleTasks[0]);
  });
});
