import { Link } from "react-router-dom";
import { theme } from "../theme";

export default function LandingPage() {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh", position: "relative", zIndex: 1,
        color: theme.textPrimary, gap: 16, textAlign: "center", padding: 24
      }}
    >
      <h1 style={{ margin: 0 }}>braintodo</h1>
      <p style={{ color: theme.textSecondary, maxWidth: 480 }}>
        Quản lý ý tưởng dạng đồ thị, tự động gợi ý liên kết và phát hiện cụm chủ đề bằng GNN.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/app" style={{ padding: "10px 20px", borderRadius: 8,
          background: theme.accent, color: theme.textPrimary, textDecoration: "none" }}>
          Vào app
        </Link>
        <Link to="/login" style={{ padding: "10px 20px", borderRadius: 8,
          border: `1px solid ${theme.panelBorder}`, color: theme.textPrimary, textDecoration: "none" }}>
          Đăng nhập
        </Link>
      </div>
    </div>
  );
}