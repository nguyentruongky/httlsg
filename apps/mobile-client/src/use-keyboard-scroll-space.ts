import { useLayoutEffect, useRef } from "react";

/** Give a focused note room to scroll above the mobile keyboard. */
export function useKeyboardScrollSpace(enabled: boolean) {
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const node = input.current;
    if (!enabled || !node) return;
    const mobile = window.matchMedia("(max-width: 1023px)");
    const viewport = window.visualViewport;
    let fullHeight = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
    );
    let frame = 0;
    let keyboardWasVisible = false;
    let padded: HTMLElement | null = null;
    let originalPadding = "";
    let originalPriority = "";
    let basePadding = 0;

    function restore() {
      if (!padded) return;
      if (originalPadding)
        padded.style.setProperty(
          "padding-bottom",
          originalPadding,
          originalPriority,
        );
      else padded.style.removeProperty("padding-bottom");
      padded = null;
    }
    function update() {
      frame = 0;
      if (!node) return;
      const layoutHeight = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
      );
      fullHeight = Math.max(fullHeight, layoutHeight);
      const visibleHeight = viewport?.height ?? window.innerHeight;
      const keyboardHeight = Math.max(0, fullHeight - visibleHeight);
      const sheet = node.closest<HTMLElement>(".bottom-sheet-dialog");
      const keyboardVisible = keyboardHeight >= 120;
      if (keyboardVisible) keyboardWasVisible = true;
      // Lift the sheet on focus, before the keyboard's resize arrives. Once
      // the keyboard has appeared, its dismissal must remove the extra space.
      const liftSheet =
        Boolean(sheet) && (!keyboardWasVisible || keyboardVisible);
      if (
        !mobile.matches ||
        document.activeElement !== node ||
        (viewport && Math.abs(viewport.scale - 1) > 0.05) ||
        (!liftSheet && !keyboardVisible)
      ) {
        restore();
        return;
      }
      if (!padded) {
        let parent = sheet ?? node.parentElement;
        while (
          !sheet &&
          parent &&
          !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)
        )
          parent = parent.parentElement;
        padded = parent ?? (document.scrollingElement as HTMLElement);
        if (!padded) return;
        originalPadding = padded.style.getPropertyValue("padding-bottom");
        originalPriority = padded.style.getPropertyPriority("padding-bottom");
        basePadding = parseFloat(getComputedStyle(padded).paddingBottom) || 0;
      }
      padded.style.setProperty(
        "padding-bottom",
        `${basePadding + (sheet ? Math.max(350, keyboardHeight) : keyboardHeight)}px`,
      );
      const rect = node.getBoundingClientRect();
      const top = (viewport?.offsetTop ?? 0) + 16;
      const bottom = (viewport?.offsetTop ?? 0) + visibleHeight - 16;
      const delta =
        rect.top < top
          ? rect.top - top
          : rect.bottom > bottom
            ? Math.min(rect.bottom - bottom, rect.top - top)
            : 0;
      if (delta) padded.scrollTop += delta;
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    function focus() {
      keyboardWasVisible = false;
      update();
      schedule();
    }
    function blur() {
      cancelAnimationFrame(frame);
      restore();
    }
    node.addEventListener("focus", focus);
    node.addEventListener("blur", blur);
    viewport?.addEventListener("resize", schedule);
    window.addEventListener("resize", schedule);
    mobile.addEventListener("change", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      restore();
      node.removeEventListener("focus", focus);
      node.removeEventListener("blur", blur);
      viewport?.removeEventListener("resize", schedule);
      window.removeEventListener("resize", schedule);
      mobile.removeEventListener("change", schedule);
    };
  }, [enabled]);
  return input;
}
