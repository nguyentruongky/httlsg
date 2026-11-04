"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, enableApiMode, advanceAuthEpoch } from "./api-client";
import type { AuthUser } from "./auth-contract";
import { replaceDepartmentCatalog } from "./catalog";
type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<AuthUser | undefined>;
  signIn: (input: {
    identifier: string;
    password: string;
  }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
};
const Context = createContext<AuthState | null>(null);
export function useAuth() {
  return useContext(Context);
}
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const generation = useRef(0);
  const principal = useRef<{ id: string; version: number } | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const requestGeneration = ++generation.current;
    enableApiMode();
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (requestGeneration !== generation.current) return;
    if (response.status === 401) {
      if (requestGeneration !== generation.current) return;
      principal.current = null;
      client.clear();
      setUser(null);
      return;
    }
    if (!response.ok)
      throw new Error("Không thể kết nối máy chủ. Vui lòng thử lại.");
    const data = (await response.json()) as { user: AuthUser };
    if (requestGeneration !== generation.current) return;
    if (
      principal.current &&
      (principal.current.id !== data.user.id ||
        principal.current.version !== data.user.authVersion)
    ) {
      advanceAuthEpoch();
      client.clear();
    }
    principal.current = { id: data.user.id, version: data.user.authVersion };
    if (data.user.requiresPasswordSetup) {
      setUser(data.user);
      setError(null);
      return data.user;
    }
    const catalogResponse = await fetch("/api/catalog", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (requestGeneration !== generation.current) return;
    if (!catalogResponse.ok) {
      if (catalogResponse.status === 401) {
        principal.current = null;
        client.clear();
        setUser(null);
        return;
      }
      throw new Error("Không thể tải danh mục Ban ngành.");
    }
    const catalog = (await catalogResponse.json()) as {
      departments: { id: string; name: string }[];
    };
    if (requestGeneration !== generation.current) return;
    replaceDepartmentCatalog(catalog.departments);
    setUser(data.user);
    setError(null);
    return data.user;
  }, [client]);
  useEffect(() => {
    let active = true;
    void refresh()
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const expired = () => {
      generation.current++;
      principal.current = null;
      setUser(null);
      client.clear();
    };
    window.addEventListener("church:session-expired", expired);
    return () => {
      active = false;
      window.removeEventListener("church:session-expired", expired);
    };
  }, [refresh, client]);
  const signIn = async (input: { identifier: string; password: string }) => {
    enableApiMode();
    await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    advanceAuthEpoch();
    client.clear();
    const user = await refresh();
    if (!user) throw new Error("Không thể xác minh phiên đăng nhập.");
    return user;
  };
  const signOut = async () => {
    generation.current++;
    await apiRequest("/api/auth/logout", { method: "POST" });
    advanceAuthEpoch();
    setUser(null);
    principal.current = null;
    client.clear();
  };
  return (
    <Context.Provider
      value={{ user, loading, error, refresh, signIn, signOut }}
    >
      {children}
    </Context.Provider>
  );
}
