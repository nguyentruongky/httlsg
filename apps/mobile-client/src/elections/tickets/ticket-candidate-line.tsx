import { useLayoutEffect, useRef } from "react";

export function TicketCandidateLine({
  number,
  name,
}: {
  number: number;
  name: string;
}) {
  const text = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = text.current;
    const line = element?.parentElement;
    if (!element || !line) return;
    let active = true;
    let lastWidth = -1;
    const fit = (force = false) => {
      if (!active || !line.clientWidth) return;
      const available = line.clientWidth;
      if (!force && available === lastWidth) return;
      lastWidth = available;
      const normalSize = parseFloat(getComputedStyle(line).fontSize);
      element.style.fontSize = `${normalSize}px`;
      const naturalWidth = element.getBoundingClientRect().width;
      if (naturalWidth > available)
        element.style.fontSize = `${(normalSize * Math.max(0, available - 1)) / naturalWidth}px`;
    };
    fit();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => fit());
    observer?.observe(line);
    const resize = () => fit(true);
    window.addEventListener("resize", resize);
    void document.fonts?.ready.then(() => fit(true));
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [number, name]);

  return (
    <li className="min-w-0 leading-relaxed">
      <span ref={text} className="inline-block whitespace-nowrap">
        <span className="mr-1 font-semibold tabular-nums text-[#777368]">
          #{number}
        </span>
        {name}
      </span>
    </li>
  );
}
