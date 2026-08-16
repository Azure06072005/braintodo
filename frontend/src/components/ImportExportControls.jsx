import { useRef, useState } from "react";
import { theme } from "../theme";

/**
 * onExport: () => Promise<{nodes, edges}>
 * onImport: (data: {nodes, edges}) => Promise<{nodes_created, edges_created, edges_skipped}>
 */
export default function ImportExportControls({ onExport, onImport }) {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleExportClick() {
    setBusy(true);
    setMessage(null);
    try {
      const data = await onExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `braintodo-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(`Xuất thất bại: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng 1 file ở lần sau
    if (!file) return;

    setBusy(true);
    setMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await onImport(data);
      setMessage(
        `Đã nhập ${result.nodes_created} node, ${result.edges_created} liên kết` +
          (result.edges_skipped ? ` (bỏ qua ${result.edges_skipped} liên kết lỗi)` : "")
      );
    } catch (err) {
      setMessage(`Nhập thất bại: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button className="bt-btn" onClick={handleExportClick} disabled={busy} style={styles.btn}>
        Xuất JSON
      </button>
      <button className="bt-btn" onClick={handleImportClick} disabled={busy} style={styles.btn}>
        {busy ? "Đang xử lý..." : "Nhập JSON"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      {message && <span style={{ fontSize: 12, color: theme.textSecondary }}>{message}</span>}
    </div>
  );
}

const styles = {
  btn: {
    background: "transparent",
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12.5,
    color: theme.textSecondary,
    cursor: "pointer",
  },
};