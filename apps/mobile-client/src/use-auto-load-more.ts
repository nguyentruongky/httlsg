import { useEffect, useRef } from "react";

const PRELOAD_DISTANCE = 320;

export function useAutoLoadMore({
  target,
  enabled,
  isFetching,
  pageCount,
  loadMore,
  threshold = 1,
}: {
  target: HTMLElement | null;
  enabled: boolean;
  isFetching: boolean;
  pageCount: number;
  loadMore: () => Promise<unknown>;
  threshold?: number;
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
      const scrollTop =
        window.visualViewport?.offsetTop ??
        window.pageYOffset ??
        document.documentElement.scrollTop ??
        0;
      const clientHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
      if (progress >= threshold) load();
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
  }, [target, enabled, isFetching, pageCount, loadMore, threshold]);
}
