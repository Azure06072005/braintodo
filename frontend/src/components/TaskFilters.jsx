import { theme } from "../theme";

export default function TaskFilters({ filters, onChange }) {
  const { type = "all", status = "all", priority = "all" } = filters || {};

  function handleTypeChange(e) {
    onChange?.({ ...filters, type: e.target.value });
  }

  function handleStatusChange(e) {
    onChange?.({ ...filters, status: e.target.value });
  }

  function handlePriorityChange(e) {
    onChange?.({ ...filters, priority: e.target.value });
  }

  return (
    <div style={styles.container}>
      <label style={styles.label}>
        <span style={styles.labelText}>Loại:</span>
        <select value={type} onChange={handleTypeChange} style={styles.select} aria-label="Loại node">
          <option value="all">Tất cả</option>
          <option value="idea">Ý tưởng</option>
          <option value="task">Task</option>
        </select>
      </label>

      <label style={styles.label}>
        <span style={styles.labelText}>Trạng thái:</span>
        <select value={status} onChange={handleStatusChange} style={styles.select} aria-label="Trạng thái">
          <option value="all">Tất cả</option>
          <option value="active">Đang mở</option>
          <option value="completed">Đã xong</option>
          <option value="overdue">Quá hạn</option>
        </select>
      </label>

      <label style={styles.label}>
        <span style={styles.labelText}>Ưu tiên:</span>
        <select value={priority} onChange={handlePriorityChange} style={styles.select} aria-label="Ưu tiên">
          <option value="all">Tất cả</option>
          <option value="low">Thấp (low)</option>
          <option value="medium">Trung bình</option>
          <option value="high">Cao (high)</option>
        </select>
      </label>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: theme.textSecondary,
  },
  labelText: {
    fontSize: 11.5,
    color: theme.textMuted,
  },
  select: {
    background: "#1c2029",
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "4px 8px",
    color: theme.textPrimary,
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
  },
};
