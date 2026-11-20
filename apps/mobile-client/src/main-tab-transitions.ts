/** Match the actual main-navigation destinations without changing their URLs. */
export function mainTabIndex(path: string): number | undefined {
  return ({
    "/client/calendar": 0,
    "/client/members": 1,
    "/client/departments": 2,
    "/client/settings": 3,
    "/client/profile": 3,
  } as Record<string, number>)[path.replace(/\/+$/, "")];
}

let cleanup: (() => void) | undefined;

export function cancelMainTabTransition() {
  cleanup?.();
  cleanup = undefined;
}

/** Snapshot only the outgoing content; the live tab bar stays interactive. */
export function transitionMainTab(commit: () => void, backward: boolean) {
  cancelMainTabTransition();
  const page = document.getElementById("mobile-content");
  if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    commit();
    return;
  }

  const rect = page.getBoundingClientRect();
  const tabTop = document.querySelector("[data-bottom-tabs]")
    ?.getBoundingClientRect().top ?? window.innerHeight;
  const top = Math.max(0, rect.top);
  const height = Math.min(rect.bottom, tabTop, window.innerHeight) - top;
  if (height <= 0) {
    commit();
    return;
  }

  const viewport = document.createElement("div");
  viewport.className = "main-tab-outgoing";
  viewport.setAttribute("aria-hidden", "true");
  viewport.inert = true;
  Object.assign(viewport.style, {
    left: `${rect.left}px`,
    top: `${top}px`,
    width: `${rect.width}px`,
    height: `${height}px`,
  });
  const snapshot = page.cloneNode(true) as HTMLElement;
  // Keep scroll positions (cloneNode does not copy them), including the directory list.
  const originalNodes = [page, ...page.querySelectorAll<HTMLElement>("*")];
  const snapshotNodes = [snapshot, ...snapshot.querySelectorAll<HTMLElement>("*")];
  for (const node of snapshotNodes) {
    node.removeAttribute("id");
    node.removeAttribute("data-scroll-restoration");
  }
  Object.assign(snapshot.style, {
    position: "absolute",
    top: `${rect.top - top}px`,
    left: "0",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    transform: "none",
    background: "var(--background)",
  });
  viewport.append(snapshot);
  page.parentElement!.append(viewport);
  originalNodes.forEach((node, index) => {
    snapshotNodes[index].scrollTop = node.scrollTop;
    snapshotNodes[index].scrollLeft = node.scrollLeft;
  });

  const previousOverflow = page.style.overflowX;
  const previousWillChange = page.style.willChange;
  page.style.overflowX = "hidden";
  page.style.willChange = "transform";
  let animations: Animation[] = [];
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    animations.forEach((animation) => animation.cancel());
    viewport.remove();
    page.style.overflowX = previousOverflow;
    page.style.willChange = previousWillChange;
    if (cleanup === finish) cleanup = undefined;
  };
  cleanup = finish;
  try {
    commit();
    const options: KeyframeAnimationOptions = {
      duration: 280,
      easing: "cubic-bezier(0.32, 0.72, 0, 1)",
      fill: "both",
    };
    animations = [
      page.animate([
        { transform: `translateX(${backward ? "100%" : "-100%"})` },
        { transform: "translateX(0)" },
      ], options),
      snapshot.animate([
        { transform: "translateX(0)" },
        { transform: `translateX(${backward ? "-100%" : "100%"})` },
      ], options),
    ];
    void Promise.all(animations.map((animation) => animation.finished))
      .then(finish, finish);
  } catch (error) {
    finish();
    throw error;
  }
}
