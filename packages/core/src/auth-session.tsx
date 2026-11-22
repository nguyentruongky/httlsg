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
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  enableApiMode,
  advanceAuthEpoch,
  clearBrowserAuth,
  startAuthSync,
  restoreAuthSession,
  currentAuthBootstrap,
  setOfflineReadAccess,
} from "./api-client";
import type { AuthUser } from "./auth-contract";
import type { AuthBootstrap } from "./auth-bootstrap";
import { replaceDepartmentCatalog } from "./catalog";
import {
  authorizationScope,
  clearPersistedReads,
  restorePersistedReads,
  saveOfflineIdentity,
  readOfflineIdentity,
} from "./query-persistence";
import { useWorkspace } from "./state";
import { startTiming } from "./performance";
import { startMemberReadSync } from "./member-sync";
type AuthState = {
  user: AuthUser | null;
  navigation: { hasAssignments: boolean };
  loading: boolean;
  offline: boolean;
  error: string | null;
  sessionMessage: string | null;
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
  const stopMemberSync = useRef<(() => void) | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [navigation, setNavigation] = useState({ hasAssignments: false });
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const clear = useCallback(() => {
    generation.current++;
    stopMemberSync.current?.();
    stopMemberSync.current = null;
    stopPersistence.current?.();
    stopPersistence.current = null;
    principal.current = null;
    applied.current = null;
    clearLocalScheduleDrafts();
    client.clear();
    void clearPersistedReads();
    setUser(null);
    setOffline(false);
    setOfflineReadAccess(false);
    onlineManager.setOnline(navigator.onLine);
    setError(null);
    setSessionMessage(null);
    setNavigation({ hasAssignments: false });
  }, [client]);
  const acceptNow = useCallback(
    async (data: AuthBootstrap, requestGeneration: number, local = false) => {
      if (requestGeneration !== generation.current) return;
      const scope = authorizationScope(
        data.user,
        useWorkspace.getState().organizationId,
      );
      if (principal.current !== scope) {
        stopMemberSync.current?.();
        stopMemberSync.current = null;
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
          stopMemberSync.current = startMemberReadSync(
            client,
            useWorkspace.getState().organizationId,
            scope,
          );
        }
        principal.current = scope;
      }
      if (requestGeneration !== generation.current) return;
      replaceDepartmentCatalog(data.departments ?? []);
      applied.current = data;
      setUser(data.user);
      setOffline(local);
      setOfflineReadAccess(local);
      onlineManager.setOnline(!local && navigator.onLine);
      setNavigation(data.navigation ?? { hasAssignments: false });
      setError(null);
      setSessionMessage(null);
      if (!local)
        await saveOfflineIdentity(data, useWorkspace.getState().organizationId);
      return data.user;
    },
    [client],
  );
  const accept = useCallback(
    (data: AuthBootstrap, requestGeneration: number, local = false) => {
      const work = applying.current.then(() =>
        acceptNow(data, requestGeneration, local),
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
    let data: AuthBootstrap | null;
    try {
      data = await restoreAuthSession();
    } catch (error) {
      if (requestGeneration !== generation.current) return;
      const saved = await readOfflineIdentity(
        useWorkspace.getState().organizationId,
      );
      if (requestGeneration !== generation.current) return;
      if (saved) return accept(saved, requestGeneration, true);
      throw error;
    }
    if (requestGeneration !== generation.current) return;
    if (!data) {
      clear();
      return;
    }
    const restored = await accept(data, requestGeneration);
    if (restored) window.dispatchEvent(new Event("church:connection-restored"));
    return restored;
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
    const expired = (event: Event) => {
      clear();
      setLoading(false);
      setSessionMessage(
        (event as CustomEvent<{ message?: string }>).detail?.message ?? null,
      );
    };
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
    const resyncScope = () => {
      void refresh().catch(() => {});
    };
    window.addEventListener("church:sync-scope-changed", resyncScope);
    return () => {
      active = false;
      stopSync();
      stopMemberSync.current?.();
      stopMemberSync.current = null;
      stopPersistence.current?.();
      stopPersistence.current = null;
      principal.current = null;
      window.removeEventListener("church:session-expired", expired);
      window.removeEventListener("church:auth-refreshed", refreshed);
      window.removeEventListener("church:sync-scope-changed", resyncScope);
    };
  }, [refresh, clear, accept]);
  useEffect(() => {
    const disconnected = () => {
      if (!user) return;
      setOffline(true);
      setOfflineReadAccess(true);
      onlineManager.setOnline(false);
    };
    const reconnect = () => {
      void refresh().catch(() => {});
    };
    const visible = () => {
      if (offline && document.visibilityState === "visible" && navigator.onLine)
        reconnect();
    };
    window.addEventListener("offline", disconnected);
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", visible);
    const timer = offline
      ? setInterval(() => {
          if (navigator.onLine) reconnect();
        }, 30000)
      : undefined;
    return () => {
      window.removeEventListener("offline", disconnected);
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", visible);
      clearInterval(timer);
    };
  }, [user, offline, refresh]);
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
        offline,
        error,
        sessionMessage,
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
