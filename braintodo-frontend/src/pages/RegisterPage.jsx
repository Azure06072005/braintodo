import { Link } from "react-router-dom";
import { theme } from "../theme";

export default function RegisterPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh", background: theme.canvasBg,
      color: theme.textPrimary, gap: 12 }}>
      <h2 style={{ margin: 0 }}>Đăng ký</h2>
      <p style={{ color: theme.textSecondary }}>(Form đăng ký — sẽ hoàn thiện ở FE015)</p>
      <Link to="/login" style={{ color: theme.accent }}>Đã có tài khoản? Đăng nhập</Link>
    </div>
  );
}