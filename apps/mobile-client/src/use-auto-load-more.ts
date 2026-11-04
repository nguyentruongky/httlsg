import { useEffect, useRef } from "react";

const PRELOAD_DISTANCE = 320;

export function useAutoLoadMore({
  target,
  enabled,
  isFetching,
  pageCount,
  loadMore,
}: {
  target: HTMLElement | null;
  enabled: boolean;
  isFetching: boolean;
  pageCount: number;
  loadMore: () => Promise<unknown>;
}) {
  const pending = useRef<Promise<unknown> | null>(null);
  const scheduleCurrentCheck = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!target || !enabled || isFetching) return;
    let disposed = false;
    let frame: number | null = null;
    const load = () => {
      if (disposed || pending.current) return;
      const request = Promise.resolve().then(loadMore);
      pending.current = request;
      // Query state displays errors and disables automatic retries until the user retries.
      void request
        .catch(() => {})
        .finally(() => {
          if (pending.current === request) pending.current = null;
          scheduleCurrentCheck.current?.();
        });
    };
    const checkPosition = () => {
      frame = null;
      if (disposed || !target.isConnected) return;
      const rect = target.getBoundingClientRect();
      // A hidden tab has no layout box and must not prefetch its entire directory.
      if (!rect.width && !rect.height) return;
      let top = window.visualViewport?.offsetTop ?? 0;
      let bottom = top + (window.visualViewport?.height ?? window.innerHeight);
      // Also support a list hosted inside a scrolling pane rather than the document.
      for (
        let parent = target.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        if (
          /(auto|scroll|overlay)/.test(getComputedStyle(parent).overflowY) &&
          parent.clientHeight > 0 &&
          parent.scrollHeight > parent.clientHeight
        ) {
          const bounds = parent.getBoundingClientRect();
          top = Math.max(top, bounds.top);
          bottom = Math.min(bottom, bounds.bottom);
        }
      }
      if (
        rect.top <= bottom + PRELOAD_DISTANCE &&
        rect.bottom >= top - PRELOAD_DISTANCE
      )
        load();
    };
    const schedule = () => {
      if (!disposed && frame === null)
        frame = window.requestAnimationFrame(checkPosition);
    };
    scheduleCurrentCheck.current = schedule;
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) load();
              // Keep observing. Fast local requests can finish without an isFetching render.
            },
            { rootMargin: `0px 0px ${PRELOAD_DISTANCE}px 0px` },
          )
        : null;
    observer?.observe(target);
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    schedule();
    return () => {
      disposed = true;
      observer?.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (scheduleCurrentCheck.current === schedule)
        scheduleCurrentCheck.current = null;
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
    // Recheck after each appended page, even if the loading state was batched away.
  }, [target, enabled, isFetching, pageCount, loadMore]);
}
