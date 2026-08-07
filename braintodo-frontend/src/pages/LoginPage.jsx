import { Link } from "react-router-dom";
import { theme } from "../theme";

export default function LoginPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh", background: theme.canvasBg,
      color: theme.textPrimary, gap: 12 }}>
      <h2 style={{ margin: 0 }}>Đăng nhập</h2>
      <p style={{ color: theme.textSecondary }}>(Form đăng nhập — sẽ hoàn thiện ở FE015)</p>
      <Link to="/register" style={{ color: theme.accent }}>Chưa có tài khoản? Đăng ký</Link>
    </div>
  );
}