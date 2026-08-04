import { theme } from "../theme";

function findClusterId(clusters, nodeId) {
  const cluster = clusters.find((c) => c.node_ids.includes(nodeId));
  return cluster ? cluster.cluster_id : null;
}

function relatedSuggestions(linkSuggestions, nodeId) {
  return linkSuggestions.filter(
    (s) => s.source_id === nodeId || s.target_id === nodeId
  );
}

export default function NodeDetailPanel({
  node,
  clusters,
  linkSuggestions,
  allNodesById,
  onEdit,
  onDelete,
  topology,
}) {
  if (!node) {
    return (
      <div style={styles.panel}>
        <p style={{ color: theme.textMuted, fontSize: 13 }}>
          Chọn một node trên đồ thị để xem chi tiết.
        </p>
      </div>
    );
  }

  const clusterId = findClusterId(clusters, node.id);
  const suggestions = relatedSuggestions(linkSuggestions, node.id);

  return (
    <div style={styles.panel}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: node.shape === "square" ? 2 : "50%",
            background: node.color || theme.accent,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <h2 style={{ fontSize: 15, fontWeight: 500, color: theme.textPrimary, margin: 0 }}>
          {node.title}
        </h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => onEdit(node)} style={styles.actionBtn}>
          Sửa
        </button>
        <button onClick={() => onDelete(node)} style={{ ...styles.actionBtn, color: "#d85a30" }}>
          Xoá
        </button>
      </div>

      <p style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.6 }}>
        {node.content || "(chưa có nội dung)"}
      </p>

      <Section title="Tags">
        {node.tags && node.tags.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {node.tags.map((tag) => (
              <span key={tag} style={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <Muted>Không có tag</Muted>
        )}
      </Section>

      <Section title="Thuộc tính thị giác">
        <Row label="Màu" value={node.color} />
        <Row label="Hình dạng" value={node.shape} />
        <Row label="Kích thước" value={node.size} />
        <Row label="Trọng số" value={node.weight} />
      </Section>

      <Section title="Embedding (GNN pipeline)">
        <Row
          label="Text embedding"
          value={node.embedding ? `có (${node.embedding.length}-d)` : "chưa có"}
        />
        <Row
          label="Graph embedding"
          value={node.graph_embedding ? `có (${node.graph_embedding.length}-d)` : "chưa có"}
        />
      </Section>

      <Section title="Cụm (cluster)">
        {clusterId !== null ? (
          <Row label="Cluster ID" value={clusterId} />
        ) : (
          <Muted>Chưa thuộc cụm nào (chưa chạy /clusters, hoặc node cô lập)</Muted>
        )}
      </Section>

      {topology && (
        <Section title="Topology">
          {topology.get(node.id) ? (
            <>
              <Row label="Degree" value={topology.get(node.id).degree} />
              <Row label="Degree centrality" value={topology.get(node.id).degree_centrality.toFixed(3)} />
              <Row
                label="Betweenness centrality"
                value={topology.get(node.id).betweenness_centrality.toFixed(3)}
              />
              <Row label="PageRank" value={topology.get(node.id).pagerank.toFixed(3)} />
            </>
          ) : (
            <Muted>Chưa có số liệu cho node này</Muted>
          )}
        </Section>
      )}

      <Section title="Gợi ý liên kết liên quan">
        {suggestions.length > 0 ? (
          suggestions.map((s, i) => {
            const otherId = s.source_id === node.id ? s.target_id : s.source_id;
            const otherTitle = allNodesById.get(otherId)?.title || otherId;
            return (
              <div key={i} style={{ fontSize: 12.5, color: theme.textSecondary, marginBottom: 4 }}>
                → <span style={{ color: theme.textPrimary }}>{otherTitle}</span>{" "}
                <span style={{ color: theme.textMuted }}>(score {s.score.toFixed(2)})</span>
              </div>
            );
          })
        ) : (
          <Muted>Không có gợi ý liên kết nào cho node này</Muted>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${theme.panelBorder}` }}>
      <p style={{ fontSize: 11, color: theme.textMuted, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
      <span style={{ color: theme.textSecondary }}>{label}</span>
      <span style={{ color: theme.textPrimary, fontFamily: "monospace" }}>{String(value)}</span>
    </div>
  );
}

function Muted({ children }) {
  return <p style={{ fontSize: 12.5, color: theme.textMuted, margin: 0 }}>{children}</p>;
}

const styles = {
  panel: {
    width: 320,
    flexShrink: 0,
    background: theme.panelBg,
    borderLeft: `1px solid ${theme.panelBorder}`,
    padding: "16px 18px",
    overflowY: "auto",
  },
  tag: {
    fontSize: 11.5,
    color: theme.textSecondary,
    background: "#1c2029",
    borderRadius: 4,
    padding: "2px 8px",
  },
  actionBtn: {
    background: "transparent",
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12.5,
    color: theme.textSecondary,
    cursor: "pointer",
  },
};