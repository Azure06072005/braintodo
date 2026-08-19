import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RegisterPage from "./RegisterPage";
import { useAuth } from "../hooks/useAuth";

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );
}

describe("RegisterPage", () => {
  it("submits email/password to register() and shows the check-your-email state", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({ register });
    const user = userEvent.setup();

    renderRegisterPage();
    await user.type(screen.getByPlaceholderText("Email"), "new@example.com");
    await user.type(screen.getByPlaceholderText("Mật khẩu"), "secret123");
    await user.click(screen.getByRole("button", { name: /đăng ký/i }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("new@example.com", "secret123");
    });
    // register() (per F009/F010) never itself returns a token/session - the
    // page's own job is just to switch to the "check your email" state.
    expect(await screen.findByText(/kiểm tra email/i)).toBeInTheDocument();
    expect(screen.getByText("new@example.com")).toBeInTheDocument();
  });

  it("shows the backend's error message (e.g. duplicate email) and stays on the form", async () => {
    const register = vi.fn().mockRejectedValue(new Error("Email already registered"));
    useAuth.mockReturnValue({ register });
    const user = userEvent.setup();

    renderRegisterPage();
    await user.type(screen.getByPlaceholderText("Email"), "dup@example.com");
    await user.type(screen.getByPlaceholderText("Mật khẩu"), "secret123");
    await user.click(screen.getByRole("button", { name: /đăng ký/i }));

    expect(await screen.findByText("Email already registered")).toBeInTheDocument();
    // Still on the form, not the "check your email" success state.
    expect(screen.queryByText(/kiểm tra email/i)).not.toBeInTheDocument();
  });
});