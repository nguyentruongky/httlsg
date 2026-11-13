import { preloadRoute } from "./route-modules";
import { useEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { clientPath } from "@org/core";

const navigationEvent = "clientnavigation";
const listeners = new Set<() => void>();
let navigationGeneration = 0;
let historyPosition = Number(window.history.state?.navigationPosition ?? 0);
let activeTransition: { skipTransition(): void } | undefined;

function transitionNavigation(commit: () => void, back = false) {
  if (
    !window.matchMedia("(max-width: 1023px)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    commit();
    return;
  }
  if (!document.startViewTransition) {
    commit();
    requestAnimationFrame(() => {
      const page =
        document.querySelector<HTMLElement>("#main-content") ??
        document.querySelector<HTMLElement>("#mobile-content");
      page?.animate(
        [
          { transform: `translateX(${back ? "-100%" : "100%"})` },
          { transform: "translateX(0)" },
        ],
        { duration: 280, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
      );
    });
    return;
  }
  activeTransition?.skipTransition();
  document.documentElement.dataset.navigationDirection = back
    ? "back"
    : "forward";
  activeTransition = document.startViewTransition(() => flushSync(commit));
}

function notify() {
  listeners.forEach((listener) => listener());
}

function onPopState() {
  const next = Number(window.history.state?.navigationPosition ?? 0);
  const back = next < historyPosition;
  historyPosition = next;
  // Query-only changes are handled by the detail pane, not a page transition.
  const nextPath = currentClientPath();
  const current = ++navigationGeneration;
  if (nextPath === observedPath) notify();
  else
    void preloadRoute(window.location.href)
      .then(() => {
        if (current === navigationGeneration)
          transitionNavigation(notify, back);
      })
      .catch(() => {
        if (current === navigationGeneration) notify();
      });
  observedPath = nextPath;
}
let observedPath = currentClientPath();

export function currentClientPath() {
  return clientPath(
    window.location.hash.startsWith("#/")
      ? window.location.hash
      : window.location.pathname,
  );
}

export function navigateClient(
  value: string,
  replace = false,
  direction?: "forward" | "back",
) {
  const path = clientPath(value);
  const oldPath = currentClientPath();
  const nextPath = new URL(path, window.location.href).pathname;
  const previousReturnHref = window.history.state?.memberReturnHref;
  const memberReturnHref = nextPath.startsWith("/client/members/")
    ? ["/dashboard/members", "/dashboard/admin/roles/members"].includes(oldPath)
      ? oldPath
      : oldPath.startsWith("/client/members/")
        ? previousReturnHref
        : undefined
    : undefined;
  const commit = () => {
    if (replace)
      window.history.replaceState(
        {
          ...window.history.state,
          navigationPosition: historyPosition,
          memberReturnHref,
        },
        "",
        path,
      );
    else if (
      window.location.pathname +
        window.location.search +
        window.location.hash !==
      path
    ) {
      historyPosition++;
      window.history.pushState(
        { navigationPosition: historyPosition, memberReturnHref },
        "",
        path,
      );
    }
    observedPath = currentClientPath();
    window.dispatchEvent(new Event(navigationEvent));
  };
  const current = ++navigationGeneration;
  const started = performance.now();
  void preloadRoute(path)
    .then(() => {
      if (current !== navigationGeneration) return;
      if (oldPath !== nextPath)
        transitionNavigation(
          commit,
          direction
            ? direction === "back"
            : oldPath.startsWith(nextPath + "/") ||
                nextPath === previousReturnHref,
        );
      else commit();
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          performance.measure("church:navigation", {
            start: started,
            end: performance.now(),
          }),
        ),
      );
    })
    .catch(() => {
      if (current === navigationGeneration) commit();
    });
}

function subscribe(listener: () => void) {
  if (!listeners.size) {
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", notify);
    window.addEventListener(navigationEvent, notify);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", notify);
      window.removeEventListener(navigationEvent, notify);
    }
  };
}

export function useClientRoute() {
  const route = useSyncExternalStore(
    subscribe,
    currentClientPath,
    () => "/client/assignments",
  );
  useEffect(() => {
    function canonicalize() {
      if (window.location.hash.startsWith("#/"))
        navigateClient(window.location.hash, true);
    }
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !link ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self")
      )
        return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.hash || url.search)
        return;
      event.preventDefault();
      navigateClient(
        url.pathname,
        false,
        link.dataset.navigation === "back" ? "back" : undefined,
      );
    }
    function prefetch(event: Event) {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link) return;
      const url = new URL(link.href, window.location.href);
      if (
        url.origin === location.origin &&
        /\/(members|departments)\//.test(url.pathname)
      )
        void preloadRoute(url.href).catch(() => {});
    }
    canonicalize();
    document.addEventListener("pointerover", prefetch);
    document.addEventListener("focusin", prefetch);
    document.addEventListener("click", onClick);
    window.addEventListener("hashchange", canonicalize);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("pointerover", prefetch);
      document.removeEventListener("focusin", prefetch);
      window.removeEventListener("hashchange", canonicalize);
    };
  }, []);
  return route;
}

export function usePathname() {
  return useSyncExternalStore(
    subscribe,
    currentClientPath,
    () => "/client/assignments",
  );
}

function currentClientSearch() {
  return window.location.search;
}

export function useClientSearch() {
  return useSyncExternalStore(subscribe, currentClientSearch, () => "");
}
