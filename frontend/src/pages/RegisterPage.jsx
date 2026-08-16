import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { theme } from "../theme";

const inputStyle = { /* giống LoginPage */ };

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);   // <-- điểm khác biệt chính so với Login

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password);
      setDone(true);   // register không trả token — phải verify email trước khi login được
    } catch (err) {
      setError(err.message);   // "Email already registered" nếu trùng
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh", background: theme.canvasBg,
        color: theme.textPrimary, gap: 12, textAlign: "center", padding: 24 }}>
        <h2 style={{ margin: 0 }}>Kiểm tra email của bạn</h2>
        <p style={{ color: theme.textSecondary, maxWidth: 360 }}>
          Đã gửi link xác thực tới <strong>{email}</strong>. Nhấn vào link đó để
          kích hoạt tài khoản, sau đó quay lại đăng nhập.
        </p>
        <Link to="/login" style={{ color: theme.accent }}>Về trang đăng nhập</Link>
      </div>
    );
  }

  return (
    <div style={{ /* giống LoginPage */ }}>
      <h2 style={{ margin: 0 }}>Đăng ký</h2>
      <form onSubmit={handleSubmit} style={{ /* ... */ }}>
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        <input type="password" placeholder="Mật khẩu" value={password}
          onChange={(e) => setPassword(e.target.value)} required minLength={8} style={inputStyle} />
        {error && <p style={{ color: theme.pulse, margin: 0, fontSize: 14 }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{ /* ... */ }}>
          {submitting ? "Đang đăng ký..." : "Đăng ký"}
        </button>
      </form>
      <Link to="/login" style={{ color: theme.accent }}>Đã có tài khoản? Đăng nhập</Link>
    </div>
  );
}