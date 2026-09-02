import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskFilters from "./TaskFilters";
import { applyTaskFilters } from "../tasks/filters";

const sampleNodes = [
  { id: "1", title: "Idea 1", node_type: "idea" },
  {
    id: "2",
    title: "Task Active High",
    node_type: "task",
    priority: "high",
    due_date: "2099-01-01",
    completed_at: null,
  },
  {
    id: "3",
    title: "Task Overdue Low",
    node_type: "task",
    priority: "low",
    due_date: "2020-01-01",
    completed_at: null,
  },
  {
    id: "4",
    title: "Task Completed",
    node_type: "task",
    priority: "medium",
    due_date: "2020-01-01",
    completed_at: "2020-01-02T10:00:00Z",
  },
];

describe("applyTaskFilters", () => {
  it("returns all nodes when filters are all / default", () => {
    expect(applyTaskFilters(sampleNodes, { type: "all", status: "all", priority: "all" })).toHaveLength(4);
  });

  it("filters by type: idea only or task only", () => {
    const ideas = applyTaskFilters(sampleNodes, { type: "idea", status: "all", priority: "all" });
    expect(ideas).toHaveLength(1);
    expect(ideas[0].id).toBe("1");

    const tasks = applyTaskFilters(sampleNodes, { type: "task", status: "all", priority: "all" });
    expect(tasks).toHaveLength(3);
  });

  it("filters by status: active, completed, overdue", () => {
    const active = applyTaskFilters(sampleNodes, { type: "all", status: "active", priority: "all" });
    expect(active.map((n) => n.id)).toEqual(["1", "2", "3"]); // Idea + uncompleted tasks

    const completed = applyTaskFilters(sampleNodes, { type: "all", status: "completed", priority: "all" });
    expect(completed.map((n) => n.id)).toEqual(["4"]);

    const overdue = applyTaskFilters(sampleNodes, { type: "all", status: "overdue", priority: "all" });
    expect(overdue.map((n) => n.id)).toEqual(["3"]);
  });

  it("filters by priority", () => {
    const high = applyTaskFilters(sampleNodes, { type: "all", status: "all", priority: "high" });
    expect(high.map((n) => n.id)).toEqual(["2"]);
  });

  it("combines type + status + priority as AND", () => {
    const res = applyTaskFilters(sampleNodes, { type: "task", status: "overdue", priority: "low" });
    expect(res.map((n) => n.id)).toEqual(["3"]);
  });
});

describe("TaskFilters component", () => {
  it("renders type, status, and priority select controls and fires onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<TaskFilters filters={{ type: "all", status: "all", priority: "all" }} onChange={onChange} />);

    expect(screen.getByLabelText(/loại node/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trạng thái/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ưu tiên/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/loại node/i), "task");
    expect(onChange).toHaveBeenCalledWith({ type: "task", status: "all", priority: "all" });

    await user.selectOptions(screen.getByLabelText(/trạng thái/i), "overdue");
    expect(onChange).toHaveBeenCalledWith({ type: "all", status: "overdue", priority: "all" });

    await user.selectOptions(screen.getByLabelText(/ưu tiên/i), "high");
    expect(onChange).toHaveBeenCalledWith({ type: "all", status: "all", priority: "high" });
  });
});
