import { theme } from "../theme";

const STATUS_LABEL = {
  open: { text: "● Live", color: "#1d9e75" },
  closed: { text: "○ Mất kết nối", color: theme.textMuted },
  error: { text: "● Lỗi kết nối", color: "#d85a30" },
  disconnected: null,
};

export default function TopBar({
  source,
  onSourceChange,
  loading,
  error,
  realtimeStatus,
  onNewNode,
  onNewEdge,
}) {
  const statusInfo = STATUS_LABEL[realtimeStatus];

  return (
    <div style={styles.bar}>
      <span style={{ fontSize: 14, fontWeight: 500, color: theme.textPrimary }}>braintodo</span>

      <button onClick={onNewNode} style={styles.newBtn}>
        + Ý tưởng mới
      </button>
      <button onClick={onNewEdge} style={styles.newBtn}>
        + Liên kết
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
        {statusInfo && (
          <span style={{ fontSize: 12, color: statusInfo.color }}>{statusInfo.text}</span>
        )}
        {loading && <span style={{ fontSize: 12, color: theme.textMuted }}>Đang tải…</span>}
        {error && (
          <span style={{ fontSize: 12, color: "#e59a2f" }}>
            Không nối được API thật ({error}) — đang dùng dữ liệu mẫu
          </span>
        )}

        <div style={styles.toggleGroup}>
          <button
            onClick={() => onSourceChange("mock")}
            style={source === "mock" ? styles.toggleActive : styles.toggle}
          >
            Mock
          </button>
          <button
            onClick={() => onSourceChange("live")}
            style={source === "live" ? styles.toggleActive : styles.toggle}
          >
            API thật
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bar: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    background: theme.panelBg,
    borderBottom: `1px solid ${theme.panelBorder}`,
    flexShrink: 0,
  },
  toggleGroup: {
    display: "flex",
    background: "#1c2029",
    borderRadius: 6,
    padding: 2,
  },
  toggle: {
    border: "none",
    background: "transparent",
    color: theme.textSecondary,
    fontSize: 12.5,
    padding: "5px 12px",
    borderRadius: 5,
    cursor: "pointer",
  },
  toggleActive: {
    border: "none",
    background: theme.accent,
    color: "#0b0e14",
    fontSize: 12.5,
    fontWeight: 500,
    padding: "5px 12px",
    borderRadius: 5,
    cursor: "pointer",
  },
  newBtn: {
    marginLeft: 16,
    background: "transparent",
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12.5,
    color: theme.textSecondary,
    cursor: "pointer",
  },
};