import { useCallback, useState } from "react";
import { createApiClient } from "../api/client";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TOKEN_KEY = "braintodo_access_token";

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const client = createApiClient(DEFAULT_API_BASE_URL);

  const login = useCallback(
    async (email, password) => {
      const { access_token } = await client.login(email, password);
      localStorage.setItem(TOKEN_KEY, access_token);
      setToken(access_token);
      return access_token;
    },
    [client]
  );

  const register = useCallback(
    (email, password) => client.register(email, password),
    [client]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  return { token, isAuthenticated: !!token, login, register, logout };
}