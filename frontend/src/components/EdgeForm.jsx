import { useState } from "react";
import { theme } from "../theme";

export default function EdgeForm({ nodes, defaultSourceId, onSubmit, onCancel }) {
  const initialSourceId = defaultSourceId || nodes[0]?.id || "";
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [targetId, setTargetId] = useState(
    nodes.find((n) => n.id !== initialSourceId)?.id || ""
  );
  const [relationType, setRelationType] = useState("related_to");
  const [style, setStyle] = useState("solid");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (sourceId === targetId) {
      setError("Node nguồn và node đích phải khác nhau");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        source_id: sourceId,
        target_id: targetId,
        relation_type: relationType,
        color: "#999999",
        style,
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (nodes.length < 2) {
    return (
      <p style={{ color: theme.textMuted, fontSize: 13 }}>
        Cần ít nhất 2 node để tạo liên kết. Hãy tạo thêm node trước.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Từ node">
        <select style={styles.input} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Đến node">
        <select style={styles.input} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Loại quan hệ (relation_type)">
        <input
          style={styles.input}
          value={relationType}
          onChange={(e) => setRelationType(e.target.value)}
          placeholder="expands, part_of, conflicts_with..."
        />
      </Field>

      <Field label="Kiểu nét vẽ">
        <select style={styles.input} value={style} onChange={(e) => setStyle(e.target.value)}>
          <option value="solid">solid</option>
          <option value="dashed">dashed</option>
        </select>
      </Field>

      {error && <p style={{ color: "#d85a30", fontSize: 12.5 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="submit" disabled={submitting} style={styles.primaryBtn}>
          {submitting ? "Đang lưu…" : "Tạo liên kết"}
        </button>
        <button type="button" onClick={onCancel} style={styles.secondaryBtn}>
          Huỷ
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11.5, color: theme.textMuted, marginBottom: 4 }}>
        {label}
        {children}
      </label>
    </div>
  );
}

const styles = {
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#1c2029",
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "7px 9px",
    color: theme.textPrimary,
    fontSize: 13,
  },
  primaryBtn: {
    background: theme.accent,
    color: "#0b0e14",
    border: "none",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "transparent",
    color: theme.textSecondary,
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
  },
};