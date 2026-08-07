import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createApiClient } from "../api/client";
import { theme } from "../theme";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("pending"); // pending | success | error

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    const client = createApiClient(DEFAULT_API_BASE_URL);
    client
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);   // chạy lại nếu token đổi (VD: người dùng bấm link khác trong lúc trang đang mở)

  const message = {
    pending: "Đang xác thực...",
    success: "Xác thực thành công! Bạn có thể đăng nhập ngay bây giờ.",
    error: "Link xác thực không hợp lệ hoặc đã hết hạn.",
  }[status];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh", background: theme.canvasBg,
      color: theme.textPrimary, gap: 12, textAlign: "center", padding: 24 }}>
      <h2 style={{ margin: 0 }}>Xác thực email</h2>
      <p style={{ color: status === "error" ? theme.pulse : theme.textSecondary, maxWidth: 360 }}>
        {message}
      </p>
      {status !== "pending" && (
        <Link to="/login" style={{ color: theme.accent }}>Về trang đăng nhập</Link>
      )}
    </div>
  );
}