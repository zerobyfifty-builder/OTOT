import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, ApiError, getToken, setToken } from "@/lib/api";
import { portalHomePath } from "@/lib/portal";
import type { AuthSession, AuthUser } from "@/types/otot";

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; home?: string }>;
  signUpTourist: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ error?: string; home?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(user: AuthUser): AuthSession {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    vendorId: user.vendorId,
    ministryRole: user.ministryRole,
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    apiFetch<{ user: AuthUser }>("/v1/auth/me")
      .then((data) => {
        if (!cancelled) setSession(toSession(data.user));
      })
      .catch(() => {
        setToken(null);
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const finishAuth = (token: string, user: AuthUser) => {
    setToken(token);
    const next = toSession(user);
    setSession(next);
    return { home: portalHomePath(next.role) };
  };

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiFetch<AuthResponse>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      return finishAuth(data.token, data.user);
    } catch (err) {
      return { error: errorMessage(err) };
    }
  }, []);

  const signUpTourist = useCallback(async (name: string, email: string, password: string) => {
    try {
      const data = await apiFetch<AuthResponse>("/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      return finishAuth(data.token, data.user);
    } catch (err) {
      return { error: errorMessage(err) };
    }
  }, []);

  const signOut = useCallback(() => {
    void apiFetch("/v1/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, signIn, signUpTourist, signOut }),
    [session, loading, signIn, signUpTourist, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
