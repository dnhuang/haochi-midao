import { useCallback, useState } from "react";
import { fetchMenu } from "../api";

export function useAuth() {
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (pw: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchMenu(pw);
      setPassword(pw);
    } catch {
      setError("Invalid password");
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setPassword(null);
  }, []);

  return { password, isAuthenticated: password !== null, login, logout, error, loading };
}
