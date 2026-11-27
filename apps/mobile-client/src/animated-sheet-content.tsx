import { useLayoutEffect, useState, type ReactNode } from "react";

export function AnimatedSheetContent({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const sheet = content?.closest<HTMLElement>('[role="dialog"]');
    if (!content || !sheet) return;
    const styles = getComputedStyle(sheet);
    const chrome =
      sheet.scrollHeight -
      content.offsetHeight +
      (parseFloat(styles.borderTopWidth) || 0) +
      (parseFloat(styles.borderBottomWidth) || 0);
    const resize = () => {
      sheet.style.height = `${content.offsetHeight + chrome}px`;
    };
    sheet.classList.add("animated-sheet-size");
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(content);
    return () => {
      observer.disconnect();
      sheet.classList.remove("animated-sheet-size");
      sheet.style.removeProperty("height");
    };
  }, [content]);
  return (
    <div ref={setContent} className="flow-root">
      {children}
    </div>
  );
}
