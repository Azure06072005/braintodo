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
  topologyEnabled,
  onToggleTopology,
  topologyLoading,
  clusterOverlayEnabled,
  onToggleClusterOverlay,
  onTogglePanel,
}) {
  const statusInfo = STATUS_LABEL[realtimeStatus];

  return (
    <div className="bt-topbar" style={styles.bar}>
      <span style={{ fontSize: 14, fontWeight: 500, color: theme.textPrimary }}>braintodo</span>

      <button className="bt-btn" onClick={onNewNode} style={styles.newBtn}>
        + Ý tưởng mới
      </button>
      <button className="bt-btn" onClick={onNewEdge} style={styles.newBtn}>
        + Liên kết
      </button>
      <button
        className="bt-btn"
        onClick={onToggleTopology}
        style={topologyEnabled ? { ...styles.newBtn, ...styles.newBtnActive } : styles.newBtn}
      >
        {topologyLoading ? "Đang tính…" : "Độ quan trọng"}
      </button>
      <button
        className="bt-btn"
        onClick={onToggleClusterOverlay}
        style={
          clusterOverlayEnabled ? { ...styles.newBtn, ...styles.newBtnActive } : styles.newBtn
        }
      >
        Cụm ý tưởng
      </button>

      {/* Chỉ có tác dụng ở màn hình hẹp — mở panel chi tiết dạng drawer.
          Ẩn qua CSS (không phải JS) để logic đơn giản, panel luôn nhận được
          class "mở" từ App, chỉ là trên desktop panel vốn đã hiện sẵn. */}
      <button className="bt-btn bt-panel-toggle" onClick={onTogglePanel} style={styles.newBtn}>
        Chi tiết
      </button>

      <div className="bt-topbar-actions" style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
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
            className="bt-btn"
            onClick={() => onSourceChange("mock")}
            style={source === "mock" ? styles.toggleActive : styles.toggle}
          >
            Mock
          </button>
          <button
            className="bt-btn"
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
  newBtnActive: {
    marginLeft: 16,
    background: theme.importantRing,
    borderColor: theme.importantRing,
    color: "#0b0e14",
    fontWeight: 500,
  },
};