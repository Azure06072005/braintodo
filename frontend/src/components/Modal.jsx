import { theme } from "../theme";

export default function Modal({ title, onClose, children }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.textPrimary }}>{title}</span>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  dialog: {
    width: 380,
    maxHeight: "85vh",
    overflowY: "auto",
    background: theme.panelBg,
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 10,
    padding: 18,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    color: theme.textMuted,
    cursor: "pointer",
    fontSize: 14,
  },
};