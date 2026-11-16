import { useEffect } from "react";

type ScrollPosition = { top: number; maximum: number; height: number };

export function useScrollNavigation(route: string) {
  useEffect(() => {
    const root = document.documentElement;
    const path = route.split("?")[0];
    if ([
      "/dashboard/settings",
      "/dashboard/calendar/email-groups",
      "/dashboard/admin/roles/settings",
      "/dashboard/activity",
      "/dashboard/otps",
      "/dashboard/church-status-report",
    ].includes(path)) {
      root.dataset.navigationHidden = "false";
      return () => { delete root.dataset.navigationHidden; };
    }
    const positions = new Map<EventTarget, ScrollPosition>();
    function position(node: Element): ScrollPosition {
      const maximum = Math.max(0, node.scrollHeight - node.clientHeight);
      return { top: Math.max(0, Math.min(node.scrollTop, maximum)), maximum, height: node.clientHeight };
    }
    if (document.scrollingElement) positions.set(document, position(document.scrollingElement));
    document.querySelectorAll<HTMLElement>("main,[data-scroll-restoration]").forEach((node) => {
      positions.set(node, position(node));
    });
    let lastIntent = -Infinity;
    let intentDirection = 0;
    let touchY: number | null = null;
    let lastTarget: EventTarget | null = null;
    let distance = 0;
    let hidden = false;
    let changedAt = -Infinity;
    const setHidden = (next: boolean) => {
      if (hidden === next) return;
      hidden = next;
      distance = 0;
      changedAt = performance.now();
      root.dataset.navigationHidden = String(next);
    };
    const intent = (delta: number) => {
      if (!delta) return;
      const direction = Math.sign(delta);
      if (direction !== intentDirection) distance = 0;
      intentDirection = direction;
      lastIntent = performance.now();
    };
    const touchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? null; };
    const touchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (y === undefined) return;
      if (touchY !== null) intent(touchY - y);
      touchY = y;
    };
    const touchEnd = () => { touchY = null; };
    const wheel = (event: WheelEvent) => { intent(event.deltaY); };
    const keyIntent = (event: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", "End"].includes(event.key)) intent(1);
      else if (["ArrowUp", "PageUp", "Home"].includes(event.key)) intent(-1);
      else if (event.key === " ") intent(event.shiftKey ? -1 : 1);
    };
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-bottom-tabs],[data-scroll-top-bar]")) setHidden(false);
    };
    const scroll = (event: Event) => {
      const target = event.target;
      if (!target || (target instanceof Element && target.closest('[role="dialog"],[role="listbox"]'))) return;
      const node = target instanceof HTMLElement ? target : document.scrollingElement;
      if (!node) return;
      const current = position(node);
      const previous = positions.get(target);
      positions.set(target, current);
      if (!previous || performance.now() - lastIntent > 1200) return;
      // Changing padding, viewport height, or loaded rows is not a new gesture.
      if (current.maximum !== previous.maximum || current.height !== previous.height) return;
      const delta = current.top - previous.top;
      if (!delta || Math.sign(delta) !== intentDirection) return;
      // Let the current transition settle, while allowing a deliberate reversal.
      if (performance.now() - changedAt < 220 && intentDirection === (hidden ? 1 : -1)) return;
      if (current.top <= 8 && intentDirection < 0) {
        setHidden(false);
        return;
      }
      if (target !== lastTarget) distance = 0;
      lastTarget = target;
      distance += delta;
      if (distance >= 24) setHidden(true);
      else if (distance <= -4) setHidden(false);
    };
    root.dataset.navigationHidden = "false";
    window.addEventListener("scroll", scroll, { capture: true, passive: true });
    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("touchend", touchEnd, { passive: true });
    window.addEventListener("touchcancel", touchEnd, { passive: true });
    window.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("keydown", keyIntent);
    window.addEventListener("focusin", focus);
    return () => {
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd);
      window.removeEventListener("touchcancel", touchEnd);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", keyIntent);
      window.removeEventListener("focusin", focus);
      delete root.dataset.navigationHidden;
    };
  }, [route]);
}
