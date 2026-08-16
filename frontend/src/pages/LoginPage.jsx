import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { theme } from "../theme";

const inputStyle = {
  padding: "10px 12px", borderRadius: 8,
  border: `1px solid ${theme.panelBorder}`,
  background: theme.panelBg, color: theme.textPrimary, width: 280,
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/app");
    } catch (err) {
      setError(err.message);   // "Invalid credentials" hoặc thông báo chưa verify từ backend
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh", background: theme.canvasBg,
      color: theme.textPrimary, gap: 12 }}>
      <h2 style={{ margin: 0 }}>Đăng nhập</h2>
      <form onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        <input type="password" placeholder="Mật khẩu" value={password}
          onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        {error && <p style={{ color: theme.pulse, margin: 0, fontSize: 14 }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{
          padding: "10px 20px", borderRadius: 8, border: "none",
          background: theme.accent, color: theme.textPrimary,
          cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1 }}>
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
      <Link to="/register" style={{ color: theme.accent }}>Chưa có tài khoản? Đăng ký</Link>
    </div>
  );
}