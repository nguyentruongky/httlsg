import { useEffect } from "react";

export function useScrollNavigation(route: string) {
  useEffect(() => {
    const root = document.documentElement;
    const positions = new Map<EventTarget, number>([[document, window.scrollY]]);
    document.querySelectorAll<HTMLElement>("main,[data-scroll-restoration]").forEach((node) => {
      positions.set(node, node.scrollTop);
    });
    let lastIntent = -Infinity;
    let lastTarget: EventTarget | null = null;
    let distance = 0;
    const show = () => { root.dataset.navigationHidden = "false"; };
    const intent = () => { lastIntent = performance.now(); };
    const keyIntent = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) intent();
    };
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-bottom-tabs],[data-scroll-top-bar]")) show();
    };
    const scroll = (event: Event) => {
      const target = event.target;
      if (!target || (target instanceof Element && target.closest('[role="dialog"],[role="listbox"]'))) return;
      const node = target instanceof HTMLElement ? target : document.scrollingElement;
      if (!node) return;
      const maximum = Math.max(0, node.scrollHeight - node.clientHeight);
      const top = Math.max(0, Math.min(node.scrollTop, maximum));
      const previous = positions.get(target) ?? top;
      positions.set(target, top);
      // Removing tab-bar padding can clamp the scroll position at the bottom.
      // That layout adjustment is not a swipe back toward the top.
      if (previous > maximum && top === maximum) return;
      // Ignore focus restoration, history restoration, and data-driven layout changes.
      if (performance.now() - lastIntent > 1200) return;
      if (top <= 8) {
        show();
        distance = 0;
        return;
      }
      const delta = top - previous;
      if (!delta) return;
      if (target !== lastTarget || Math.sign(delta) !== Math.sign(distance)) distance = 0;
      lastTarget = target;
      distance += delta;
      if (distance >= 24) root.dataset.navigationHidden = "true";
      else if (distance <= -4) show();
    };
    show();
    window.addEventListener("scroll", scroll, { capture: true, passive: true });
    window.addEventListener("touchmove", intent, { passive: true });
    window.addEventListener("wheel", intent, { passive: true });
    window.addEventListener("keydown", keyIntent);
    window.addEventListener("focusin", focus);
    return () => {
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("touchmove", intent);
      window.removeEventListener("wheel", intent);
      window.removeEventListener("keydown", keyIntent);
      window.removeEventListener("focusin", focus);
      delete root.dataset.navigationHidden;
    };
  }, [route]);
}
