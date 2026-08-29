import { useState } from "react";
import { Link } from "react-router-dom";
import { theme } from "../theme";
import GraphCanvas from "../components/GraphCanvas";
import { mockNodes, mockEdges, mockClusters } from "../data/mockData";

/**
 * Public marketing page (FE024). Redesigned around a Universum-Labs-style
 * narrative: Vision -> How it works (numbered steps) -> a fully interactive
 * Example section built entirely on mock data. This is deliberately the
 * ONLY place mock/demo data is shown publicly - once FE026 lands, the
 * authenticated app (AppPage) will show live data only.
 *
 * The hero section (heading + tagline + CTA links) is kept byte-for-byte
 * compatible with the pre-redesign version so LandingPage.test.jsx's
 * original assertions (heading "braintodo", links "Vào app"/"Đăng nhập")
 * keep passing unmodified - the redesign adds sections below the hero
 * rather than replacing it.
 *
 * Content is hardcoded Vietnamese for now, matching the app's still-pending
 * i18n migration list (see claude-progress.md) - LandingPage was already
 * tracked as not-yet-migrated before this session and stays that way here;
 * migrating this page's (now larger) copy is tracked as its own follow-up.
 */
export default function LandingPage() {
  const [demoSelectedId, setDemoSelectedId] = useState(null);
  const demoSelectedNode = mockNodes.find((n) => n.id === demoSelectedId) || null;

  return (
    <div style={{ position: "relative", zIndex: 1, color: theme.textPrimary }}>
      {/* --- Hero --- */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 16,
          textAlign: "center",
          padding: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>braintodo</h1>
        <p style={{ color: theme.textSecondary, maxWidth: 480 }}>
          Quản lý ý tưởng dạng đồ thị, tự động gợi ý liên kết và phát hiện cụm chủ đề bằng GNN.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link
            to="/app"
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: theme.accent,
              color: theme.textPrimary,
              textDecoration: "none",
            }}
          >
            Vào app
          </Link>
          <Link
            to="/login"
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: `1px solid ${theme.panelBorder}`,
              color: theme.textPrimary,
              textDecoration: "none",
            }}
          >
            Đăng nhập
          </Link>
        </div>
      </section>

      {/* --- Vision / what braintodo is --- */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Ý tưởng của bạn, dưới dạng một dải ngân hà</h2>
        <p style={{ color: theme.textSecondary, maxWidth: 640, margin: "0 auto 32px" }}>
          Thay vì một danh sách to-do phẳng, braintodo lưu ý tưởng như các node trong một đồ thị
          tri thức — được kết nối, phân cụm, và khám phá bằng Graph Neural Network.
        </p>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          <FeatureCard
            color={theme.depthColors[0]}
            title="Đồ thị, không phải danh sách"
            description="Mỗi ý tưởng là một node; các liên kết ngữ nghĩa hoặc logic giữa chúng là edge có kiểu."
          />
          <FeatureCard
            color={theme.depthColors[1]}
            title="Gợi ý kết nối bằng GNN"
            description="Embedding văn bản kết hợp cấu trúc đồ thị để tự động đề xuất những mối liên hệ bạn chưa nghĩ tới."
          />
          <FeatureCard
            color={theme.depthColors[2]}
            title="Tự động phát hiện cụm"
            description="Thuật toán Leiden nhóm các ý tưởng liên quan thành 'vùng tư duy', kèm nhãn ngữ nghĩa tự động."
          />
        </div>
      </section>

      {/* --- How it works --- */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Hoạt động như thế nào</h2>
        <ol style={{ maxWidth: 640, margin: "0 auto", padding: 0, listStyle: "none" }}>
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <li key={step.title} style={stepStyle}>
              <span style={stepNumberStyle}>{i + 1}</span>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>{step.title}</h3>
                <p style={{ margin: 0, color: theme.textSecondary, fontSize: 13.5 }}>
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* --- Example (mock data) --- */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Ví dụ (dữ liệu mẫu)</h2>
        <p style={{ color: theme.textSecondary, maxWidth: 640, margin: "0 auto 24px" }}>
          Đây là một đồ thị ý tưởng mẫu — thử bấm vào một node để xem chi tiết. Dữ liệu này chỉ
          để minh hoạ, không kết nối tới tài khoản hay dự án thật nào.
        </p>
        <div
          data-testid="landing-demo-graph"
          style={{
            display: "flex",
            gap: 16,
            maxWidth: 900,
            height: 380,
            margin: "0 auto",
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, position: "relative" }}>
            <GraphCanvas
              nodes={mockNodes}
              edges={mockEdges}
              clusters={mockClusters}
              selectedNodeId={demoSelectedId}
              onNodeClick={setDemoSelectedId}
            />
          </div>
          <div
            style={{
              width: 220,
              flexShrink: 0,
              padding: 16,
              borderLeft: `1px solid ${theme.panelBorder}`,
              textAlign: "left",
              fontSize: 13,
            }}
          >
            {demoSelectedNode ? (
              <>
                <h4 style={{ margin: "0 0 6px" }}>{demoSelectedNode.title}</h4>
                <p style={{ margin: "0 0 8px", color: theme.textSecondary }}>
                  {demoSelectedNode.content}
                </p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {demoSelectedNode.tags.map((tag) => (
                    <span key={tag} style={tagStyle}>
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: theme.textMuted }}>Bấm vào một node bên trái để xem chi tiết.</p>
            )}
          </div>
        </div>
      </section>

      {/* --- Final CTA --- */}
      <section style={{ ...sectionStyle, paddingBottom: 96 }}>
        <h2 style={headingStyle}>Sẵn sàng tổ chức ý tưởng của bạn?</h2>
        <Link
          to="/register"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            borderRadius: 8,
            background: theme.accent,
            color: theme.textPrimary,
            textDecoration: "none",
          }}
        >
          Bắt đầu miễn phí
        </Link>
      </section>
    </div>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    title: "Tạo ý tưởng như một node",
    description: "Đặt tiêu đề, nội dung, tags, chọn màu/hình dạng — mỗi ý tưởng là một node trong đồ thị của bạn.",
  },
  {
    title: "Liên kết & để GNN gợi ý",
    description: "Vẽ liên kết có kiểu giữa các node, hoặc để hệ thống tự đề xuất những kết nối tiềm năng dựa trên embedding.",
  },
  {
    title: "Khám phá cụm & xem đồ thị 2D/3D",
    description: "Các cụm chủ đề được tự động phát hiện và đặt tên; xoay đồ thị trong không gian 3D để nhìn toàn cảnh.",
  },
  {
    title: "Đăng nhập để lưu dự án của bạn",
    description: "Tạo tài khoản để dữ liệu của bạn được lưu riêng, an toàn, và đồng bộ theo thời gian thực.",
  },
];

function FeatureCard({ color, title, description }) {
  return (
    <div
      style={{
        width: 240,
        padding: 20,
        borderRadius: 12,
        border: `1px solid ${theme.panelBorder}`,
        textAlign: "left",
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, marginBottom: 10 }} />
      <h3 style={{ margin: "0 0 6px", fontSize: 14.5 }}>{title}</h3>
      <p style={{ margin: 0, color: theme.textSecondary, fontSize: 13 }}>{description}</p>
    </div>
  );
}

const sectionStyle = {
  padding: "64px 24px",
  textAlign: "center",
  borderTop: `1px solid ${theme.panelBorder}`,
};

const headingStyle = {
  margin: "0 0 24px",
  fontSize: 22,
};

const stepStyle = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  textAlign: "left",
  marginBottom: 20,
};

const stepNumberStyle = {
  flexShrink: 0,
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: theme.accent,
  color: "#0b0e14",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 600,
};

const tagStyle = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 10,
  background: theme.panelBg,
  border: `1px solid ${theme.panelBorder}`,
  color: theme.textSecondary,
};