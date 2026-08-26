import { useState } from "react";
import { theme } from "../theme";
import { useTranslation } from "../i18n/useTranslation";

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
  const { t } = useTranslation();
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
      setError(t("node_form.title_required_error"));
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
          .map((tag) => tag.trim())
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
      <Field label={t("node_form.title_label")}>
        <input
          style={styles.input}
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          autoFocus
        />
      </Field>

      <Field label={t("node_form.content_label")}>
        <textarea
          style={{ ...styles.input, height: 70, resize: "vertical" }}
          value={form.content}
          onChange={(e) => setField("content", e.target.value)}
        />
      </Field>

      <Field label={t("node_form.tags_label")}>
        <input
          style={styles.input}
          value={form.tags}
          onChange={(e) => setField("tags", e.target.value)}
          placeholder={t("node_form.tags_placeholder")}
        />
      </Field>

      <div style={{ display: "flex", gap: 10 }}>
        <Field label={t("node_form.color_label")} style={{ flex: 1 }}>
          <input
            type="color"
            style={{ ...styles.input, padding: 2, height: 32 }}
            value={form.color}
            onChange={(e) => setField("color", e.target.value)}
          />
        </Field>
        <Field label={t("node_form.shape_label")} style={{ flex: 1 }}>
          <select
            style={styles.input}
            value={form.shape}
            onChange={(e) => setField("shape", e.target.value)}
          >
            <option value="circle">{t("node_form.shape_circle")}</option>
            <option value="square">{t("node_form.shape_square")}</option>
          </select>
        </Field>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Field label={t("node_form.size_label")} style={{ flex: 1 }}>
          <input
            type="number"
            min={4}
            max={40}
            style={styles.input}
            value={form.size}
            onChange={(e) => setField("size", e.target.value)}
          />
        </Field>
        <Field label={t("node_form.weight_label")} style={{ flex: 1 }}>
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
          {submitting
            ? t("node_form.saving")
            : mode === "create"
              ? t("node_form.submit_create")
              : t("node_form.submit_edit")}
        </button>
        <button type="button" onClick={onCancel} style={styles.secondaryBtn}>
          {t("node_form.cancel")}
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