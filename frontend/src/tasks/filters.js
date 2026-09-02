/**
 * Client-side helper to filter nodes array by type, status, and priority.
 * Note: While type can also be filtered server-side (F025), status and priority
 * are client-side filtered over already-fetched nodes.
 */
export function applyTaskFilters(nodes, filters) {
  if (!filters) return nodes;
  const { type = "all", status = "all", priority = "all" } = filters;
  const today = new Date().toISOString().slice(0, 10);

  return nodes.filter((n) => {
    // 1. Type filter
    if (type !== "all") {
      const nodeType = n.node_type || "idea";
      if (nodeType !== type) return false;
    }

    // 2. Status filter
    if (status !== "all") {
      if (status === "active") {
        if (n.node_type === "task" && n.completed_at) return false;
      } else if (status === "completed") {
        if (n.node_type !== "task" || !n.completed_at) return false;
      } else if (status === "overdue") {
        if (n.node_type !== "task" || n.completed_at || !n.due_date || n.due_date >= today) {
          return false;
        }
      }
    }

    // 3. Priority filter
    if (priority !== "all") {
      if (n.priority !== priority) return false;
    }

    return true;
  });
}
