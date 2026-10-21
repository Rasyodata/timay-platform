import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface AuthState {
  authed: boolean;
  /** True right after a logout, so the login screen can greet accordingly. */
  justLoggedOut: boolean;
  login: () => void;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Prototype session gate — açılışta önce giriş ekranı gelsin (otomatik dashboard değil).
  const [authed, setAuthed] = useState(false);
  const [justLoggedOut, setJustLoggedOut] = useState(false);

  const login = useCallback(() => {
    setAuthed(true);
    setJustLoggedOut(false);
  }, []);

  const logout = useCallback(() => {
    setAuthed(false);
    setJustLoggedOut(true);
  }, []);

  return (
    <Ctx.Provider value={{ authed, justLoggedOut, login, logout }}>{children}</Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
