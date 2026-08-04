import { useState } from "react";
import { theme } from "../theme";

export default function SearchBar({ onSearch, onClear, onSelectMatch, result, searching }) {
  const [q, setQ] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!q.trim()) return;
    onSearch(q);
  }

  function handleClear() {
    setQ("");
    onClear();
  }

  return (
    <div style={{ position: "relative" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm ý tưởng… (từ khoá hoặc ngữ nghĩa)"
          style={styles.input}
        />
        <button type="submit" style={styles.searchBtn}>
          {searching ? "…" : "Tìm"}
        </button>
        {result && (
          <button type="button" onClick={handleClear} style={styles.clearBtn}>
            Xoá
          </button>
        )}
      </form>

      {result && (
        <div className="bt-search-dropdown" style={styles.dropdown}>
          {result.matches.length === 0 ? (
            <p style={{ fontSize: 12.5, color: theme.textMuted, margin: "8px 12px" }}>
              Không tìm thấy ý tưởng nào khớp.
            </p>
          ) : (
            <>
              <p style={styles.dropdownHeader}>
                {result.matches.length} kết quả · vùng lân cận: {result.subgraph_nodes.length} node
              </p>
              {result.matches.map((m) => {
                const node = result.subgraph_nodes.find((n) => n.id === m.node_id);
                if (!node) return null;
                return (
                  <button
                    key={m.node_id}
                    onClick={() => onSelectMatch(m.node_id)}
                    style={styles.resultItem}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: node.color || theme.accent,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, textAlign: "left" }}>{node.title}</span>
                    <span style={{ color: theme.textMuted, fontSize: 11 }}>
                      {m.score.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  input: {
    width: 260,
    boxSizing: "border-box",
    background: "#1c2029",
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "6px 10px",
    color: theme.textPrimary,
    fontSize: 12.5,
  },
  searchBtn: {
    background: theme.accent,
    color: "#0b0e14",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
  },
  clearBtn: {
    background: "transparent",
    color: theme.textSecondary,
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12.5,
    cursor: "pointer",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    width: 320,
    background: theme.panelBg,
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 8,
    padding: "6px 0",
    zIndex: 50,
    maxHeight: 280,
    overflowY: "auto",
  },
  dropdownHeader: {
    fontSize: 11,
    color: theme.textMuted,
    margin: "2px 12px 6px",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  resultItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    boxSizing: "border-box",
    background: "transparent",
    border: "none",
    padding: "6px 12px",
    color: theme.textPrimary,
    fontSize: 12.5,
    cursor: "pointer",
    textAlign: "left",
  },
};