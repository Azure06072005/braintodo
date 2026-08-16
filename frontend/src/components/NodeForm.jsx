import { useState } from "react";
import { theme } from "../theme";

const EMPTY = {
  title: "",
  content: "",
  tags: "",
  weight: 1,
  color: "#7f77dd",
  shape: "circle",
  size: 12,
};

/**
 * mode: "create" | "edit"
 * initial: Node hiện có (khi edit) — tags là mảng, cần join thành chuỗi
 * để sửa trong input text, rồi split lại lúc submit.
 */
export default function NodeForm({ mode, initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(() =>
    initial
      ? { ...EMPTY, ...initial, tags: (initial.tags || []).join(", ") }
      : EMPTY
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Tiêu đề không được để trống");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: form.title.trim(),
        content: form.content,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        weight: Number(form.weight),
        color: form.color,
        shape: form.shape,
        size: Number(form.size),
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Tiêu đề *">
        <input
          style={styles.input}
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          autoFocus
        />
      </Field>

      <Field label="Nội dung">
        <textarea
          style={{ ...styles.input, height: 70, resize: "vertical" }}
          value={form.content}
          onChange={(e) => setField("content", e.target.value)}
        />
      </Field>

      <Field label="Tags (phân cách bằng dấu phẩy)">
        <input
          style={styles.input}
          value={form.tags}
          onChange={(e) => setField("tags", e.target.value)}
          placeholder="project, phase-3"
        />
      </Field>

      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Màu" style={{ flex: 1 }}>
          <input
            type="color"
            style={{ ...styles.input, padding: 2, height: 32 }}
            value={form.color}
            onChange={(e) => setField("color", e.target.value)}
          />
        </Field>
        <Field label="Hình dạng" style={{ flex: 1 }}>
          <select
            style={styles.input}
            value={form.shape}
            onChange={(e) => setField("shape", e.target.value)}
          >
            <option value="circle">circle</option>
            <option value="square">square</option>
          </select>
        </Field>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Kích thước" style={{ flex: 1 }}>
          <input
            type="number"
            min={4}
            max={40}
            style={styles.input}
            value={form.size}
            onChange={(e) => setField("size", e.target.value)}
          />
        </Field>
        <Field label="Trọng số" style={{ flex: 1 }}>
          <input
            type="number"
            step={0.1}
            style={styles.input}
            value={form.weight}
            onChange={(e) => setField("weight", e.target.value)}
          />
        </Field>
      </div>

      {error && <p style={{ color: "#d85a30", fontSize: 12.5 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="submit" disabled={submitting} style={styles.primaryBtn}>
          {submitting ? "Đang lưu…" : mode === "create" ? "Tạo ý tưởng" : "Lưu thay đổi"}
        </button>
        <button type="button" onClick={onCancel} style={styles.secondaryBtn}>
          Huỷ
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 10, ...style }}>
      <label style={{ display: "block", fontSize: 11.5, color: theme.textMuted, marginBottom: 4 }}>
        {label}
      </label>
      {children}
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