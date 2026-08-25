import { theme } from "../theme";
import { useTranslation } from "../i18n/useTranslation";

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
  extraActions,
}) {
  const { t, locale, setLocale, supportedLocales } = useTranslation();

  const STATUS_LABEL = {
    open: { text: t("topbar.status_live"), color: "#1d9e75" },
    closed: { text: t("topbar.status_disconnected"), color: theme.textMuted },
    error: { text: t("topbar.status_error"), color: "#d85a30" },
    disconnected: null,
  };
  const statusInfo = STATUS_LABEL[realtimeStatus];

  return (
    <div className="bt-topbar" style={styles.bar}>
      <span style={{ fontSize: 14, fontWeight: 500, color: theme.textPrimary }}>
        {t("common.app_name")}
      </span>

      <button className="bt-btn" onClick={onNewNode} style={styles.newBtn}>
        {t("topbar.new_node")}
      </button>
      <button className="bt-btn" onClick={onNewEdge} style={styles.newBtn}>
        {t("topbar.new_edge")}
      </button>
      <button
        className="bt-btn"
        onClick={onToggleTopology}
        style={topologyEnabled ? { ...styles.newBtn, ...styles.newBtnActive } : styles.newBtn}
      >
        {topologyLoading ? t("topbar.topology_computing") : t("topbar.topology_toggle")}
      </button>
      <button
        className="bt-btn"
        onClick={onToggleClusterOverlay}
        style={
          clusterOverlayEnabled ? { ...styles.newBtn, ...styles.newBtnActive } : styles.newBtn
        }
      >
        {t("topbar.cluster_toggle")}
      </button>

      <button className="bt-btn bt-panel-toggle" onClick={onTogglePanel} style={styles.newBtn}>
        {t("topbar.detail_toggle")}
      </button>

      <div className="bt-topbar-actions" style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
        {statusInfo && (
          <span style={{ fontSize: 12, color: statusInfo.color }}>{statusInfo.text}</span>
        )}
        {loading && <span style={{ fontSize: 12, color: theme.textMuted }}>{t("common.loading")}</span>}
        {error && (
          <span style={{ fontSize: 12, color: "#e59a2f" }}>
            {t("topbar.api_error", { error })}
          </span>
        )}

        {extraActions}

        <select
          aria-label={t("topbar.language_label")}
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          style={styles.langSelect}
        >
          {supportedLocales.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>

        <div style={styles.toggleGroup}>
          <button
            className="bt-btn"
            onClick={() => onSourceChange("mock")}
            style={source === "mock" ? styles.toggleActive : styles.toggle}
          >
            {t("topbar.source_mock")}
          </button>
          <button
            className="bt-btn"
            onClick={() => onSourceChange("live")}
            style={source === "live" ? styles.toggleActive : styles.toggle}
          >
            {t("topbar.source_live")}
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
  langSelect: {
    background: "#1c2029",
    color: theme.textSecondary,
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    fontSize: 12.5,
    padding: "4px 6px",
    cursor: "pointer",
  },
};