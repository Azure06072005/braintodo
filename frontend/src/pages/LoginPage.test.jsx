import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";
import { useAuth } from "../hooks/useAuth";

// LoginPage reads `login` straight from the useAuth() hook (no props), so
// component-level tests mock the hook module rather than the fetch layer
// underneath it - useAuth.test.js already covers login()'s own behavior
// (fetch shape, token persistence, error surfacing) at the hook level.
vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("submits email/password to login() and navigates to /app on success", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({ login });
    const user = userEvent.setup();

    renderLoginPage();
    await user.type(screen.getByPlaceholderText("Email"), "a@example.com");
    await user.type(screen.getByPlaceholderText("Mật khẩu"), "secret123");
    await user.click(screen.getByRole("button", { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("a@example.com", "secret123");
      expect(mockNavigate).toHaveBeenCalledWith("/app");
    });
  });

  it("shows the backend's error message and does not navigate on failure", async () => {
    const login = vi.fn().mockRejectedValue(new Error("Invalid credentials"));
    useAuth.mockReturnValue({ login });
    const user = userEvent.setup();

    renderLoginPage();
    await user.type(screen.getByPlaceholderText("Email"), "a@example.com");
    await user.type(screen.getByPlaceholderText("Mật khẩu"), "wrong");
    await user.click(screen.getByRole("button", { name: /đăng nhập/i }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveLogin;
    const login = vi.fn(
      () => new Promise((resolve) => { resolveLogin = resolve; })
    );
    useAuth.mockReturnValue({ login });
    const user = userEvent.setup();

    renderLoginPage();
    await user.type(screen.getByPlaceholderText("Email"), "a@example.com");
    await user.type(screen.getByPlaceholderText("Mật khẩu"), "secret123");
    await user.click(screen.getByRole("button", { name: /đăng nhập/i }));

    expect(screen.getByRole("button")).toBeDisabled();
    resolveLogin();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });
});
