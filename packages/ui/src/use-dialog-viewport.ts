"use client";
import * as React from "react";

export function useDialogViewport(open: boolean | undefined) {
  const content = React.useRef<HTMLDivElement | null>(null);
  const syncViewport = React.useCallback(() => {
    const node = content.current;
    if (!node || typeof window === "undefined") return;
    const viewport = window.visualViewport;
    const height = viewport?.height ?? window.innerHeight;
    const top = viewport?.offsetTop ?? 0;
    node.style.setProperty("--dialog-viewport-height", `${height}px`);
    node.style.setProperty("--dialog-viewport-center", `${top + height / 2}px`);
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      node.contains(focused) &&
      focused.matches("input,textarea,select")
    )
      focused.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, []);
  const attachContent = React.useCallback(
    (node: HTMLDivElement | null) => {
      content.current = node;
      if (node) syncViewport();
    },
    [syncViewport],
  );
  React.useEffect(() => {
    syncViewport();
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, [open, syncViewport]);
  return attachContent;
}
