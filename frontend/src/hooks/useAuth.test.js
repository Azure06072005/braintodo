import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";

const TOKEN_KEY = "braintodo_access_token";

/**
 * useAuth talks to the real backend shape confirmed in
 * src/braintodo/auth/schemas.py: register -> UserOut, login -> TokenResponse
 * ({ access_token, token_type }). These smoke tests mock global fetch so
 * the hook's own logic (token persistence, state updates) is exercised
 * without a live backend.
 */
describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("starts unauthenticated when there is no stored token", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it("picks up a token already in localStorage on mount", () => {
    localStorage.setItem(TOKEN_KEY, "existing-token");
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe("existing-token");
  });

  it("login stores the access token and flips isAuthenticated", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "abc123", token_type: "bearer" }),
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      await result.current.login("user@example.com", "secret123");
    });

    expect(result.current.token).toBe("abc123");
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe("abc123");

    // Confirm it hit the real endpoint shape from auth/schemas.py.
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "secret123" }),
      })
    );
  });

  it("login surfaces the backend's error detail on failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ detail: "Email not verified" }),
    });

    const { result } = renderHook(() => useAuth());

    await expect(
      act(async () => {
        await result.current.login("user@example.com", "wrongpass");
      })
    ).rejects.toThrow("Email not verified");

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("register calls the register endpoint and does not itself log the user in", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "u1", email: "new@example.com", is_verified: false }),
    });

    const { result } = renderHook(() => useAuth());

    let response;
    await act(async () => {
      response = await result.current.register("new@example.com", "secret123");
    });

    expect(response).toEqual({ id: "u1", email: "new@example.com", is_verified: false });
    // Registration alone doesn't grant a session - verification still required.
    expect(result.current.isAuthenticated).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/register"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("logout clears the token from state and localStorage", async () => {
    localStorage.setItem(TOKEN_KEY, "existing-token");
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});