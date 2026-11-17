import { preloadRoute } from "./route-modules";
import { useEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { clientPath } from "@org/core";

const navigationEvent = "clientnavigation";
const listeners = new Set<() => void>();
let historyPosition = Number(window.history.state?.navigationPosition ?? 0);
let pageAnimation: Animation | undefined;
let historyNavigation = false;
let restoringScroll = false;
let scrollFrame: number | undefined;
type ScrollPosition = {
  navigationScroll: number;
  navigationScrollContainers: Record<string, number>;
};
const routeScroll = new Map<string, ScrollPosition>();
export const isHistoryNavigation = () => historyNavigation;

function saveNavigationScroll(persist = true) {
  const containers: Record<string, number> = {};
  document
    .querySelectorAll<HTMLElement>("[data-scroll-restoration]")
    .forEach((node) => {
      if (node.getClientRects().length)
        containers[node.dataset.scrollRestoration!] = node.scrollTop;
    });
  const position = {
    navigationScroll: window.scrollY,
    navigationScrollContainers: containers,
  };
  routeScroll.set(window.location.pathname + window.location.search, position);
  if (persist)
    window.history.replaceState({ ...window.history.state, ...position }, "");
}

function onScroll() {
  if (restoringScroll || scrollFrame !== undefined) return;
  // Safari limits History API writes. Scrolling should only update memory;
  // persist the current entry once when leaving it through client navigation.
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = undefined;
    if (!restoringScroll) saveNavigationScroll(false);
  });
}

export function restoreNavigationScroll() {
  restoringScroll = true;
  const state =
    routeScroll.get(window.location.pathname + window.location.search) ??
    window.history.state;
  window.scrollTo({ top: state?.navigationScroll ?? 0, behavior: "instant" });
  document
    .querySelectorAll<HTMLElement>("[data-scroll-restoration]")
    .forEach((node) => {
      if (node.getClientRects().length)
        node.scrollTop =
          state?.navigationScrollContainers?.[
            node.dataset.scrollRestoration!
          ] ?? 0;
    });
  requestAnimationFrame(() => {
    restoringScroll = false;
  });
}

function transitionNavigation(
  commit: () => void,
  _back = false,
  profilePush = false,
) {
  // Update the route immediately. Document view transitions defer this update
  // and cover the page with a snapshot that can swallow subsequent taps.
  pageAnimation?.cancel();
  flushSync(commit);
  if (
    profilePush ||
    !window.matchMedia("(max-width: 1023px)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const page =
    document.querySelector<HTMLElement>("#main-content") ??
    document.querySelector<HTMLElement>("#mobile-content");
  pageAnimation = page?.animate([{ opacity: 0.96 }, { opacity: 1 }], {
    duration: 280,
    easing: "cubic-bezier(0.32, 0.72, 0, 1)",
  });
}

function notify() {
  listeners.forEach((listener) => listener());
}

let nativeHistoryNavigation = false;
let requestedBack = false;
export const isNativeHistoryNavigation = () => nativeHistoryNavigation;
export function goBackClient() {
  requestedBack = true;
  window.history.back();
}
function onPopState() {
  restoringScroll = true;
  const next = Number(window.history.state?.navigationPosition ?? 0);
  const back = next < historyPosition;
  historyPosition = next;
  nativeHistoryNavigation = !requestedBack;
  historyNavigation = true;
  requestedBack = false;
  pageAnimation?.cancel();
  // Safari has already animated the interactive swipe. Commit its destination
  // synchronously, without replaying another transition or waiting for code.
  if (nativeHistoryNavigation) {
    flushSync(notify);
    restoreNavigationScroll();
  } else if (currentClientPath() === observedPath) flushSync(notify);
  else transitionNavigation(notify, back);
  observedPath = currentClientPath();
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
  const isMemberProfile = (pathname: string) =>
    /^\/client\/(?:members|(?:leader|board)\/members)\/[^/]+$/.test(pathname);
  const memberPreviousProfileHref = replace
    ? window.history.state?.memberPreviousProfileHref
    : isMemberProfile(nextPath) &&
        (isMemberProfile(oldPath) || oldPath === "/client/profile")
      ? oldPath
      : undefined;
  const memberReturnHref = nextPath.startsWith("/client/members/")
    ? [
        "/dashboard/members",
        "/dashboard/admin/roles/members",
        "/client/personnel",
        "/client/members",
      ].includes(oldPath)
      ? oldPath
      : oldPath.startsWith("/client/members/")
        ? previousReturnHref
        : undefined
    : undefined;
  const commit = () => {
    nativeHistoryNavigation = false;
    saveNavigationScroll();
    historyNavigation = direction === "back";
    restoringScroll = true;
    if (replace)
      window.history.replaceState(
        {
          ...window.history.state,
          navigationPosition: historyPosition,
          memberReturnHref,
          memberPreviousProfileHref,
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
        {
          navigationPosition: historyPosition,
          memberReturnHref,
          memberPreviousProfileHref,
          navigationPreviousHref:
            window.location.pathname + window.location.search,
          ...(historyNavigation ? routeScroll.get(path) : {}),
        },
        "",
        path,
      );
    }
    observedPath = currentClientPath();
    window.dispatchEvent(new Event(navigationEvent));
    requestAnimationFrame(() => {
      restoringScroll = false;
    });
  };
  const started = performance.now();
  // Fetch code in parallel with rendering the destination's loading state.
  void preloadRoute(path).catch(() => {});
  if (oldPath !== nextPath)
    transitionNavigation(
      commit,
      direction
        ? direction === "back"
        : oldPath.startsWith(nextPath + "/") || nextPath === previousReturnHref,
      isMemberProfile(nextPath),
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
}

function subscribe(listener: () => void) {
  if (!listeners.size) {
    window.history.scrollRestoration = "manual";
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", notify);
    window.addEventListener(navigationEvent, notify);
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", notify);
      window.removeEventListener(navigationEvent, notify);
      window.removeEventListener("scroll", onScroll, true);
      if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
      scrollFrame = undefined;
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
      if (
        link.dataset.navigation === "back" &&
        window.history.state?.navigationPreviousHref === url.pathname
      ) {
        goBackClient();
        return;
      }
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
