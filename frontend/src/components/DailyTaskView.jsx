import { useEffect, useState } from "react";
import { theme } from "../theme";
import { formatDuration } from "../tasks/format";

export default function DailyTaskView({
  tasks = [],
  fetchSummary,
  onCompleteNode,
  onReopenNode,
  onSelectNode,
  selectedNodeId,
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (fetchSummary) {
      setLoadingSummary(true);
      fetchSummary(selectedDate)
        .then((res) => {
          if (!cancelled) setSummary(res);
        })
        .catch(() => {
          if (!cancelled) setSummary(null);
        })
        .finally(() => {
          if (!cancelled) setLoadingSummary(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [selectedDate, fetchSummary]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={styles.container}>
      {/* Header & Date selector */}
      <div style={styles.header}>
        <h2 style={styles.title}>Danh sách nhiệm vụ hôm nay ({todayStr})</h2>
        <div style={styles.datePickerContainer}>
          <span style={{ fontSize: 12, color: theme.textSecondary }}>Ngày thống kê:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.dateInput}
            aria-label="Chọn ngày thống kê"
          />
        </div>
      </div>

      {/* Summary strip */}
      <div style={styles.summaryStrip}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Tạo mới</span>
          <span style={{ ...styles.summaryValue, color: theme.accent }}>
            {loadingSummary ? "…" : (summary?.created ?? 0)}
          </span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Đã xong</span>
          <span style={{ ...styles.summaryValue, color: theme.depthColors[1] }}>
            {loadingSummary ? "…" : (summary?.completed ?? 0)}
          </span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Quá hạn</span>
          <span style={{ ...styles.summaryValue, color: theme.pulse }}>
            {loadingSummary ? "…" : (summary?.overdue ?? 0)}
          </span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>Thời gian xử lý TB</span>
          <span style={styles.summaryValue}>
            {loadingSummary ? "…" : formatDuration(summary?.avg_completion_seconds)}
          </span>
        </div>
      </div>

      {/* Task list for today */}
      <div style={styles.taskListContainer}>
        <h3 style={styles.subTitle}>Nhiệm vụ cần làm ({tasks.length})</h3>
        {tasks.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ color: theme.textMuted, fontSize: 13, margin: 0 }}>
              Không có nhiệm vụ nào cần làm hôm nay hoặc quá hạn. Tuyệt vời!
            </p>
          </div>
        ) : (
          <div style={styles.taskList}>
            {tasks.map((task) => {
              const isSelected = selectedNodeId === task.id;
              const isOverdue = task.due_date && task.due_date < todayStr && !task.completed_at;
              return (
                <div
                  key={task.id}
                  onClick={() => onSelectNode?.(task)}
                  style={{
                    ...styles.taskCard,
                    borderColor: isSelected ? theme.accent : theme.panelBorder,
                    background: isSelected ? "#14172a" : theme.panelBg,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (task.completed_at) {
                          onReopenNode?.(task);
                        } else {
                          onCompleteNode?.(task);
                        }
                      }}
                      style={{
                        ...styles.checkboxBtn,
                        borderColor: task.completed_at ? theme.depthColors[1] : theme.panelBorder,
                        background: task.completed_at ? theme.depthColors[1] : "transparent",
                      }}
                      aria-label={`Hoàn thành ${task.title}`}
                    >
                      {task.completed_at ? "✓" : ""}
                    </button>

                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: "0 0 4px",
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: task.completed_at ? theme.textMuted : theme.textPrimary,
                          textDecoration: task.completed_at ? "line-through" : "none",
                        }}
                      >
                        {task.title}
                      </p>
                      <div style={{ display: "flex", gap: 8, fontSize: 11.5, color: theme.textSecondary }}>
                        {task.due_date && (
                          <span style={{ color: isOverdue ? theme.pulse : theme.textSecondary }}>
                            Hạn: {task.due_date} {isOverdue ? "(Quá hạn)" : ""}
                          </span>
                        )}
                        {task.priority && (
                          <span style={styles.badge}>
                            {task.priority}
                          </span>
                        )}
                        {task.recurrence_rule && (
                          <span style={styles.badge}>
                            🔁 {task.recurrence_rule}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px 24px",
    maxWidth: 900,
    margin: "0 auto",
    color: theme.textPrimary,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    color: theme.textPrimary,
  },
  datePickerContainer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  dateInput: {
    background: "#1c2029",
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "4px 8px",
    color: theme.textPrimary,
    fontSize: 12.5,
    outline: "none",
  },
  summaryStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    background: theme.panelBg,
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 8,
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11.5,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 600,
    color: theme.textPrimary,
  },
  taskListContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: 500,
    margin: 0,
    color: theme.textPrimary,
  },
  emptyState: {
    background: theme.panelBg,
    border: `1px dashed ${theme.panelBorder}`,
    borderRadius: 8,
    padding: "24px",
    textAlign: "center",
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  taskCard: {
    display: "flex",
    alignItems: "center",
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 8,
    padding: "10px 14px",
    cursor: "pointer",
    transition: "border-color 0.15s ease, background 0.15s ease",
  },
  checkboxBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: "1.5px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: "bold",
    color: "#05070f",
    padding: 0,
    flexShrink: 0,
  },
  badge: {
    background: "#1c2029",
    borderRadius: 4,
    padding: "1px 6px",
    fontSize: 11,
    color: theme.textSecondary,
  },
};
