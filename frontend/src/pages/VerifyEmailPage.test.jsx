import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VerifyEmailPage from "./VerifyEmailPage";

function renderWithToken(token) {
  const entry = token ? `/verify-email?token=${encodeURIComponent(token)}` : "/verify-email";
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <VerifyEmailPage />
    </MemoryRouter>
  );
}

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the pending state immediately, then success once the fetch to /auth/verify resolves", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "u1", email: "a@example.com", is_verified: true }),
    });

    renderWithToken("good-token");
    expect(screen.getByText(/đang xác thực/i)).toBeInTheDocument();

    expect(await screen.findByText(/xác thực thành công/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/verify?token=good-token"),
      expect.anything()
    );
    expect(screen.getByRole("link", { name: /về trang đăng nhập/i })).toHaveAttribute("href", "/login");
  });

  it("shows an error state when the backend rejects the token (expired/invalid)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Token expired" }),
    });

    renderWithToken("bad-token");

    expect(await screen.findByText(/không hợp lệ hoặc đã hết hạn/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /về trang đăng nhập/i })).toBeInTheDocument();
  });

  it("shows an error state immediately when no token is present in the URL, without calling fetch", () => {
    global.fetch = vi.fn();

    renderWithToken(null);

    expect(screen.getByText(/không hợp lệ hoặc đã hết hạn/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});