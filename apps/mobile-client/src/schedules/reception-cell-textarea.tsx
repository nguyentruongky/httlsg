"use client";
import { useLayoutEffect, useRef } from "react";
import { cn } from "@org/ui";
export function ReceptionCellTextarea({
  text,
  label,
  invalid,
  description,
  onChange,
  onBlur,
}: {
  text: string;
  label: string;
  invalid: boolean;
  description?: string;
  onChange: (text: string) => void;
  onBlur: (text: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      if (ref.current) {
        ref.current.style.height = "auto";
        ref.current.style.height =
          Math.max(44, ref.current.scrollHeight) + "px";
      }
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [text]);
  return (
    <textarea
      ref={ref}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={description}
      className="block min-h-11 w-full min-w-32 resize-none appearance-none overflow-hidden rounded-none border-0 bg-transparent p-0 text-base leading-relaxed outline-none shadow-none focus:bg-transparent focus:outline-none focus:shadow-none focus-visible:bg-transparent focus-visible:ring-0 sm:text-sm"
      style={{ paddingBlock: text.split("\n").length === 1 ? ".625rem" : 0 }}
      rows={Math.max(1, text.split("\n").length)}
      maxLength={4000}
      placeholder="Chưa phân công"
      value={text}
      onPaste={(event) => {
        event.preventDefault();
        const trim = (value: string) =>
          value
            .replace(/\r\n?/g, "\n")
            .split("\n")
            .map((line) => line.trim())
            .join("\n")
            .trim();
        const pasted = trim(event.clipboardData.getData("text/plain"));
        if (!pasted) return;
        const field = event.currentTarget,
          start = field.selectionStart,
          end = field.selectionEnd;
        const insert = pasted.slice(
          0,
          Math.max(0, 4000 - field.value.length + end - start),
        );
        if (!insert) return;
        const before = field.value.slice(0, start) + insert;
        const next = trim(before + field.value.slice(end));
        const caret = Math.min(trim(before).length, next.length);
        onChange(next);
        requestAnimationFrame(() => {
          if (document.activeElement === field && field.value === next)
            field.setSelectionRange(caret, caret);
        });
      }}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) => onBlur(event.target.value)}
    />
  );
}
