import { useEffect, useSyncExternalStore } from "react";
import { clientPath } from "@org/core";

const navigationEvent = "clientnavigation";

export function currentClientPath() {
  return clientPath(
    window.location.hash.startsWith("#/")
      ? window.location.hash
      : window.location.pathname,
  );
}

export function navigateClient(value: string, replace = false) {
  const path = clientPath(value);
  if (replace) window.history.replaceState(null, "", path);
  else if (
    window.location.pathname + window.location.search + window.location.hash !==
    path
  )
    window.history.pushState(null, "", path);
  window.dispatchEvent(new Event(navigationEvent));
}

function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener("hashchange", notify);
  window.addEventListener(navigationEvent, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener("hashchange", notify);
    window.removeEventListener(navigationEvent, notify);
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
      navigateClient(url.pathname);
    }
    canonicalize();
    document.addEventListener("click", onClick);
    window.addEventListener("hashchange", canonicalize);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", canonicalize);
    };
  }, []);
  return route;
}

export function usePathname() {
  return currentClientPath();
}
