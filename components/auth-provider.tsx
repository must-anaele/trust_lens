"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  email?: string;
  createdAt?: string;
  lastSignInAt?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  country?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await response.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onAuthChange = () => { void refresh(); };
    window.addEventListener("trustlens-auth-change", onAuthChange);
    return () => window.removeEventListener("trustlens-auth-change", onAuthChange);
  }, [refresh]);

  const signOut = useCallback(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, refresh, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) window.location.replace("/account?next=/markets");
  }, [loading, user]);

  if (loading) return <main className="container protected-loading" role="status">Checking your account…</main>;
  if (!user) return <main className="container protected-loading" role="status">Redirecting to sign in…</main>;
  return <>{children}</>;
}
