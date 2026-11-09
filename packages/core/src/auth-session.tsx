"use client";
import { clearLocalScheduleDrafts } from "./local-schedule-drafts";
import { clearDevicePush } from "./pwa-client";
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
import {
  apiRequest,
  enableApiMode,
  advanceAuthEpoch,
  authenticatedFetch,
  clearBrowserAuth,
  startAuthSync,
} from "./api-client";
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
  signOutAll: () => Promise<void>;
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
  const [securityNotice, setSecurityNotice] = useState(false);
  const refresh = useCallback(async () => {
    const requestGeneration = ++generation.current;
    enableApiMode();
    const response = await authenticatedFetch("/api/auth/me", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (requestGeneration !== generation.current) return;
    if (response.status === 401) {
      if (requestGeneration !== generation.current) return;
      clearLocalScheduleDrafts();
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
      clearLocalScheduleDrafts();
      client.clear();
    }
    principal.current = { id: data.user.id, version: data.user.authVersion };
    if (data.user.requiresPasswordSetup) {
      setUser(data.user);
      setError(null);
      return data.user;
    }
    const catalogResponse = await authenticatedFetch("/api/catalog", {
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
    const stopSync = startAuthSync();
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
    const securityAlert = () => setSecurityNotice(true);
    window.addEventListener("church:security-alert", securityAlert);
    window.addEventListener("church:session-expired", expired);
    return () => {
      active = false;
      stopSync();
      window.removeEventListener("church:session-expired", expired);
      window.removeEventListener("church:security-alert", securityAlert);
    };
  }, [refresh, client]);
  const signIn = async (input: { identifier: string; password: string }) => {
    enableApiMode();
    setSecurityNotice(false);
    advanceAuthEpoch();
    await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    client.clear();
    const user = await refresh();
    if (!user) throw new Error("Không thể xác minh phiên đăng nhập.");
    return user;
  };
  const logout = async (all = false) => {
    generation.current++;
    await apiRequest(all ? "/api/auth/logout-all" : "/api/auth/logout", {
      method: "POST",
    });
    clearBrowserAuth();
    setUser(null);
    principal.current = null;
    client.clear();
    await clearDevicePush();
  };
  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        refresh,
        signIn,
        signOut: () => logout(),
        signOutAll: () => logout(true),
      }}
    >
      {(securityNotice || user?.securityAlert) && (
        <div
          role="alert"
          className="border-b border-destructive bg-background p-4 text-sm text-destructive"
        >
          Phát hiện mã gia hạn phiên đã được sử dụng lại. Tất cả thiết bị đã bị
          đăng xuất. Vui lòng kiểm tra bảo mật tài khoản.
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
