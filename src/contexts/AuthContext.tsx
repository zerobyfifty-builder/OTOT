import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_PASSWORD } from "@/data/seed";
import { portalHomePath } from "@/lib/portal";
import { useStore } from "@/contexts/StoreContext";
import type { AppRole, MockSession } from "@/types/otot";

const SESSION_KEY = "otot.mock-session";

function readSession(): MockSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as MockSession) : null;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  session: MockSession | null;
  signIn: (email: string, password: string) => { error?: string; home?: string };
  signUpTourist: (name: string, email: string, password: string) => { error?: string; home?: string };
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { state, createTourist } = useStore();
  const [session, setSession] = useState<MockSession | null>(readSession);

  const persist = (next: MockSession | null) => {
    setSession(next);
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  };

  const toSession = (user: {
    id: string;
    email: string;
    name: string;
    role: AppRole;
    vendorId?: string;
  }): MockSession => ({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    vendorId: user.vendorId,
  });

  const signIn = useCallback(
    (email: string, password: string) => {
      if (password !== DEMO_PASSWORD) {
        return { error: "Invalid email or password." };
      }
      const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) return { error: "Invalid email or password." };
      const next = toSession(user);
      persist(next);
      return { home: portalHomePath(next.role) };
    },
    [state.users],
  );

  const signUpTourist = useCallback(
    (name: string, email: string, password: string) => {
      if (password !== DEMO_PASSWORD) {
        return { error: `Use the demo password ${DEMO_PASSWORD} for this frontend preview.` };
      }
      const existing = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (existing) {
        if (existing.role !== "tourist") return { error: "That email is already in use." };
        const next = toSession(existing);
        persist(next);
        return { home: portalHomePath(next.role) };
      }
      const user = createTourist(name, email);
      const next = toSession(user);
      persist(next);
      return { home: portalHomePath(next.role) };
    },
    [createTourist, state.users],
  );

  const signOut = useCallback(() => persist(null), []);

  const value = useMemo(
    () => ({ session, signIn, signUpTourist, signOut }),
    [session, signIn, signUpTourist, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
