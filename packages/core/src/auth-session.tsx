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
  clearBrowserAuth,
  startAuthSync,
  restoreAuthSession,
  currentAuthBootstrap,
} from "./api-client";
import type { AuthUser } from "./auth-contract";
import type { AuthBootstrap } from "./auth-bootstrap";
import { replaceDepartmentCatalog } from "./catalog";
import {
  authorizationScope,
  clearPersistedReads,
  restorePersistedReads,
} from "./query-persistence";
import { useWorkspace } from "./state";
import { startTiming } from "./performance";
type AuthState = {
  user: AuthUser | null;
  navigation: { hasAssignments: boolean };
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
  const applying = useRef<Promise<void>>(Promise.resolve());
  const principal = useRef<string | null>(null);
  const applied = useRef<AuthBootstrap | null>(null);
  const stopPersistence = useRef<(() => void) | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [navigation, setNavigation] = useState({ hasAssignments: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clear = useCallback(() => {
    generation.current++;
    stopPersistence.current?.();
    stopPersistence.current = null;
    principal.current = null;
    applied.current = null;
    clearLocalScheduleDrafts();
    client.clear();
    void clearPersistedReads();
    setUser(null);
    setNavigation({ hasAssignments: false });
  }, [client]);
  const acceptNow = useCallback(
    async (data: AuthBootstrap, requestGeneration: number) => {
      if (requestGeneration !== generation.current) return;
      const scope = authorizationScope(
        data.user,
        useWorkspace.getState().organizationId,
      );
      if (principal.current !== scope) {
        stopPersistence.current?.();
        stopPersistence.current = null;
        setUser(null);
        if (principal.current) {
          advanceAuthEpoch();
          clearLocalScheduleDrafts();
          await clearPersistedReads();
        }
        client.clear();
        if (!data.user.requiresPasswordSetup) {
          const stop = await restorePersistedReads(client, scope);
          if (requestGeneration !== generation.current) {
            stop();
            client.clear();
            return;
          }
          stopPersistence.current = stop;
        }
        principal.current = scope;
      }
      if (requestGeneration !== generation.current) return;
      replaceDepartmentCatalog(data.departments ?? []);
      applied.current = data;
      setUser(data.user);
      setNavigation(data.navigation ?? { hasAssignments: false });
      setError(null);
      return data.user;
    },
    [client],
  );
  const accept = useCallback(
    (data: AuthBootstrap, requestGeneration: number) => {
      const work = applying.current.then(() =>
        acceptNow(data, requestGeneration),
      );
      applying.current = work.then(
        () => {},
        () => {},
      );
      return work;
    },
    [acceptNow],
  );
  const refresh = useCallback(async () => {
    const requestGeneration = ++generation.current;
    enableApiMode();
    const candidate = currentAuthBootstrap();
    const data =
      candidate && candidate !== applied.current
        ? candidate
        : await restoreAuthSession();
    if (requestGeneration !== generation.current) return;
    if (!data) {
      clear();
      return;
    }
    return accept(data, requestGeneration);
  }, [accept, clear]);
  useEffect(() => {
    let active = true;
    const done = startTiming("bootstrap");
    const stopSync = startAuthSync();
    void refresh()
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) {
          done();
          setLoading(false);
        }
      });
    const expired = () => clear();
    const refreshed = () => {
      const data = currentAuthBootstrap();
      if (data && principal.current) {
        const requestGeneration = ++generation.current;
        void accept(data, requestGeneration).catch(() => {
          if (active) setError("Không thể cập nhật phiên đăng nhập.");
        });
      }
    };
    window.addEventListener("church:session-expired", expired);
    window.addEventListener("church:auth-refreshed", refreshed);
    return () => {
      active = false;
      stopSync();
      stopPersistence.current?.();
      stopPersistence.current = null;
      principal.current = null;
      window.removeEventListener("church:session-expired", expired);
      window.removeEventListener("church:auth-refreshed", refreshed);
    };
  }, [refresh, clear, accept]);
  const signIn = async (input: { identifier: string; password: string }) => {
    enableApiMode();
    advanceAuthEpoch();
    const data = await apiRequest<AuthBootstrap>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const user = await accept(data, ++generation.current);
    if (!user) throw new Error("Không thể xác minh phiên đăng nhập.");
    return user;
  };
  const logout = async (all = false) => {
    try {
      await apiRequest(all ? "/api/auth/logout-all" : "/api/auth/logout", {
        method: "POST",
      });
    } finally {
      clearBrowserAuth();
      clear();
      await clearDevicePush();
    }
  };
  return (
    <Context.Provider
      value={{
        user,
        navigation,
        loading,
        error,
        refresh,
        signIn,
        signOut: () => logout(),
        signOutAll: () => logout(true),
      }}
    >
      {children}
    </Context.Provider>
  );
}
