// Signed-in user and app context (e.g. warehouse) for the whole app.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { request } from "./api";

export interface ContextVar {
  name: string;
  label: string;
  defaultValue: string;
  options: string[];
  required: boolean;
}

interface SessionState {
  loading: boolean;
  signIn: "mybtp" | "none";
  user: { name: string; email: string } | null;
  context: Record<string, string>;
  contextVars: ContextVar[];
  missingContext: string[];
  signInWith: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setContext: (values: Record<string, string>) => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

interface MeResponse {
  signIn: "mybtp" | "none";
  user: { name: string; email: string } | null;
  context: Record<string, string>;
  contextVars: ContextVar[];
  missingContext: string[];
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);

  const refresh = useCallback(async () => {
    setMe(await request<MeResponse>("/api/auth/me"));
  }, []);

  useEffect(() => {
    refresh().catch(() => setMe({ signIn: "mybtp", user: null, context: {}, contextVars: [], missingContext: [] }));
    const onSignedOut = () => void refresh();
    window.addEventListener("app:signed-out", onSignedOut);
    return () => window.removeEventListener("app:signed-out", onSignedOut);
  }, [refresh]);

  const value: SessionState = {
    loading: me === null,
    signIn: me ? me.signIn : "mybtp",
    user: me ? me.user : null,
    context: me ? me.context : {},
    contextVars: me ? me.contextVars : [],
    missingContext: me ? me.missingContext : [],
    signInWith: async (email, password) => {
      await request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      await refresh();
    },
    signOut: async () => {
      await request("/api/auth/logout", { method: "POST" });
      await refresh();
    },
    setContext: async (values) => {
      await request("/api/auth/context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      await refresh();
    },
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
