"use client";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import {
  useLocalWorshipPeopleInCharge,
  useAuth,
  canCalendar,
  detectWorshipWorkerCategories,
  prependWorkerMentions,
  composeWorshipInformationRequest,
  hasWorshipValue,
  isWorshipProgramText,
  normalizeWorshipWorkerText,
  worshipWorkerCategorySearchTerms,
  WORSHIP_WORKER_CATEGORIES,
  type WorshipPersonInCharge,
  type WorshipWorkerCategory,
} from "@org/core";

type Trigger = {
  start: number;
  end: number;
  query: string;
  source: string;
  category: string;
};
function mentionAt(
  value: string,
  end: number,
  context: string,
): Trigger | null {
  const prefix = value.slice(0, end);
  const match = /(?:^|[\s(])@([\p{L}\p{M}\p{N} .'-]*)$/u.exec(prefix);
  if (!match) return null;
  const start = end - match[1].length - 1;
  const line = prefix.slice(prefix.lastIndexOf("\n", start) + 1, start);
  const categories = detectWorshipWorkerCategories(line);
  const searchedCategories = (
    Object.keys(WORSHIP_WORKER_CATEGORIES) as WorshipWorkerCategory[]
  ).filter((category) =>
    worshipWorkerCategorySearchTerms(category).some(
      (term) =>
        normalizeWorshipWorkerText(term) ===
        normalizeWorshipWorkerText(match[1]),
    ),
  );
  const fallback = searchedCategories.length
    ? searchedCategories
    : categories.length
      ? categories
      : detectWorshipWorkerCategories(context);
  const category =
    fallback.length === 1
      ? fallback[0]
      : fallback.length && fallback.every((item) => item.startsWith("ban_hat_"))
        ? "ban_hat"
        : "";
  return { start, end, query: match[1].trim(), source: value, category };
}
/** A pasted program with real values qualifies; an empty template or fragment does not. */
function missingInformationContacts(text: string): string[] {
  if (!isWorshipProgramText(text)) return [];
  const information = composeWorshipInformationRequest(text);
  if (Object.values(information.fields).filter(hasWorshipValue).length < 2)
    return [];
  return [
    ...(information.missingFields.some((field) => field.group === "A")
      ? ["Phan Thiệu Huy"]
      : []),
    ...(information.missingFields.some((field) => field.group === "B")
      ? ["Nguyễn Sơn Hải"]
      : []),
  ];
}
/** Mirror textarea typography to locate the caret, including wrapping and scroll. */
function caretPosition(element: HTMLTextAreaElement, position: number) {
  const mirror = document.createElement("div");
  const computed = getComputedStyle(element);
  for (const property of [
    "box-sizing",
    "width",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "letter-spacing",
    "line-height",
    "text-indent",
    "tab-size",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
  ]) {
    mirror.style.setProperty(property, computed.getPropertyValue(property));
  }
  Object.assign(mirror.style, {
    position: "fixed",
    top: "0",
    left: "-9999px",
    visibility: "hidden",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    borderStyle: "solid",
  });
  mirror.textContent = element.value.slice(0, position);
  const marker = document.createElement("span");
  marker.textContent = element.value.slice(position) || ".";
  mirror.append(marker);
  document.body.append(mirror);
  const result = {
    left: marker.offsetLeft - element.scrollLeft,
    top: marker.offsetTop - element.scrollTop,
    lineHeight: parseFloat(computed.lineHeight) || 24,
  };
  mirror.remove();
  return result;
}
export function WorshipMentionTextarea({
  value,
  onValueChange,
  contextText = "",
  enabled = true,
  ref: forwardedRef,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  contextText?: string;
  enabled?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}) {
  const user = useAuth()?.user;
  const allowed =
    enabled && !props.disabled && !props.readOnly && canCalendar(user);
  const element = useRef<HTMLTextAreaElement | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const [pastedProgram, setPastedProgram] = useState<{
    source: string;
    caret: number;
    contacts: string[];
  } | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const suppressedValue = useRef<string | null>(null);
  const latest = useRef(onValueChange);
  latest.current = onValueChange;
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [composing, setComposing] = useState(false);
  const search = normalizeWorshipWorkerText(trigger?.query ?? "");
  const directory = useLocalWorshipPeopleInCharge();
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 240 });
  const listId = useId();
  const open = Boolean(allowed && trigger && trigger.source === value);
  const items = useMemo(() => {
    const category = trigger?.category ?? "";
    const filtered = (directory.data?.people ?? []).filter((worker) => {
      if (
        category &&
        !worker.categories.some(
          (item) =>
            item === category ||
            (category === "ban_hat" && item.startsWith("ban_hat_")),
        )
      )
        return false;
      return normalizeWorshipWorkerText(
        [
          worker.name,
          worker.roleLabel,
          worker.phone,
          ...worker.categories.flatMap(worshipWorkerCategorySearchTerms),
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(search);
    });
    return [
      ...new Map(filtered.map((worker) => [worker.name, worker])).values(),
    ];
  }, [directory.data, trigger?.category, search]);
  const loading = !directory.ready;
  useEffect(() => {
    setActiveIndex(0);
  }, [search, trigger?.category]);
  useEffect(() => {
    if (!pastedProgram) return;
    if (!allowed || value !== pastedProgram.source) {
      setPastedProgram(null);
      return;
    }
    if (!directory.data) return;
    const next = prependWorkerMentions(
      value,
      directory.data.people
        .filter((worker) =>
          pastedProgram.contacts.some(
            (name) =>
              normalizeWorshipWorkerText(name) ===
              normalizeWorshipWorkerText(worker.name),
          ),
        )
        .map((person) => ({ fullName: person.name })),
    );
    setPastedProgram(null);
    if (
      next !== value &&
      (!props.maxLength || next.length <= props.maxLength)
    ) {
      pendingCaret.current = pastedProgram.caret + next.length - value.length;
      suppressedValue.current = next;
      latest.current(next);
    }
  }, [value, allowed, directory.data, pastedProgram, props.maxLength]);
  useLayoutEffect(() => {
    if (pendingCaret.current === null || !element.current) return;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    element.current.focus();
    element.current.setSelectionRange(caret, caret);
  }, [value]);
  useLayoutEffect(() => {
    if (!open || !element.current || !container.current || !trigger) return;
    const update = () => {
      const input = element.current!;
      const parent = container.current!;
      const caret = caretPosition(input, trigger.end);
      const inputRect = input.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const x = inputRect.left - parentRect.left + caret.left;
      const y = inputRect.top - parentRect.top + caret.top;
      const height = Math.min(240, Math.max(80, parentRect.height - 12));
      const below = y + caret.lineHeight + 4;
      const top =
        below + height <= parentRect.height
          ? below
          : Math.max(0, y - height - 4);
      setPosition({
        top,
        left: Math.max(
          0,
          Math.min(x, parentRect.width - Math.min(320, parentRect.width)),
        ),
        maxHeight: height,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container.current);
    element.current.addEventListener("scroll", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      element.current?.removeEventListener("scroll", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [open, trigger]);
  const choose = (worker: WorshipPersonInCharge) => {
    if (!allowed) return;
    const input = element.current;
    const start =
      open && trigger ? trigger.start : (input?.selectionStart ?? value.length);
    const end =
      open && trigger ? trigger.end : (input?.selectionEnd ?? value.length);
    const mention = "@" + worker.name + " ";
    const next = value.slice(0, start) + mention + value.slice(end);
    if (props.maxLength && next.length > props.maxLength) return;
    pendingCaret.current = start + mention.length;
    suppressedValue.current = next;
    setTrigger(null);
    latest.current(next);
  };
  return (
    <div
      ref={container}
      className="worship-mention-composer relative flex min-h-0 flex-1 flex-col"
    >
      <textarea
        {...props}
        ref={(node) => {
          element.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        value={value}
        role={allowed ? "combobox" : undefined}
        aria-autocomplete={allowed ? "list" : undefined}
        aria-expanded={allowed ? open : undefined}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && items[activeIndex] ? listId + "-" + activeIndex : undefined
        }
        onPaste={(event) => {
          props.onPaste?.(event);
          if (event.defaultPrevented || !allowed) return;
          const clipboard = event.clipboardData.getData("text/plain");
          const start = event.currentTarget.selectionStart;
          const end = event.currentTarget.selectionEnd;
          const available =
            props.maxLength === undefined
              ? clipboard.length
              : Math.max(0, props.maxLength - value.length + end - start);
          const pasted = clipboard.slice(0, available);
          const contacts = missingInformationContacts(pasted);
          if (!contacts.length) return;
          event.preventDefault();
          const source = value.slice(0, start) + pasted + value.slice(end);
          const caret = start + pasted.length;
          pendingCaret.current = caret;
          suppressedValue.current = source;
          setTrigger(null);
          setPastedProgram({ source, caret, contacts });
          latest.current(source);
        }}
        onChange={(event) => {
          suppressedValue.current = null;
          latest.current(event.target.value);
          setTrigger(
            allowed && !(event.nativeEvent as InputEvent).isComposing
              ? mentionAt(
                  event.target.value,
                  event.target.selectionStart,
                  contextText + "\n" + event.target.value,
                )
              : null,
          );
        }}
        onCompositionStart={(event) => {
          props.onCompositionStart?.(event);
          setComposing(true);
          setTrigger(null);
        }}
        onCompositionEnd={(event) => {
          props.onCompositionEnd?.(event);
          setComposing(false);
          if (allowed)
            setTrigger(
              mentionAt(
                event.currentTarget.value,
                event.currentTarget.selectionStart,
                contextText + "\n" + value,
              ),
            );
        }}
        onSelect={(event) => {
          props.onSelect?.(event);
          if (
            allowed &&
            !composing &&
            event.currentTarget.value !== suppressedValue.current &&
            document.activeElement === element.current
          )
            setTrigger(
              mentionAt(
                event.currentTarget.value,
                event.currentTarget.selectionStart,
                contextText + "\n" + event.currentTarget.value,
              ),
            );
        }}
        onClick={(event) => {
          props.onClick?.(event);
          if (allowed)
            setTrigger(
              mentionAt(
                value,
                event.currentTarget.selectionStart,
                contextText + "\n" + value,
              ),
            );
        }}
        onBlur={(event) => {
          props.onBlur?.(event);
          if (!container.current?.contains(event.relatedTarget))
            setTrigger(null);
        }}
        onKeyDown={(event) => {
          props.onKeyDown?.(event);
          if (!open || event.defaultPrevented || event.nativeEvent.isComposing)
            return;
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setTrigger(null);
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(
              (index) =>
                (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  Math.max(1, items.length)) %
                Math.max(1, items.length),
            );
          }
          if (event.key === "Enter" && items[activeIndex] && !loading) {
            event.preventDefault();
            choose(items[activeIndex]);
          }
        }}
      />
      {open && (
        <div
          className="absolute z-50 w-80 max-w-full overflow-y-auto overscroll-contain rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
          style={position}
          onMouseDown={(event) => event.preventDefault()}
        >
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
            {trigger?.category === "ban_hat"
              ? "Ban hát"
              : (WORSHIP_WORKER_CATEGORIES[
                  trigger?.category as WorshipWorkerCategory
                ] ?? "Người phục vụ")}
          </p>
          <div id={listId} role="listbox" aria-label="Gợi ý người phục vụ">
            {loading ? (
              <p role="status" className="p-3 text-sm">
                Đang tìm…
              </p>
            ) : !directory.data ? (
              <p role="status" className="p-3 text-sm text-muted-foreground">
                Chưa tải được danh sách người phục vụ. Kết nối mạng để tải danh
                sách tự động.
              </p>
            ) : items.length ? (
              items.map((worker, index) => (
                <button
                  key={worker.id}
                  id={listId + "-" + index}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={
                    "block w-full rounded-lg px-3 py-2 text-left text-sm " +
                    (index === activeIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent")
                  }
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => choose(worker)}
                >
                  {normalizeWorshipWorkerText(worker.roleLabel ?? "") ===
                  "chap su" ? (
                    <span className="block font-medium">
                      {normalizeWorshipWorkerText(worker.name).startsWith(
                        "chap su ",
                      )
                        ? worker.name
                        : `Chấp sự ${worker.name}`}
                    </span>
                  ) : (
                    <>
                      <span className="block font-medium">{worker.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[
                          worker.roleLabel,
                          worker.categories
                            .map((item) => WORSHIP_WORKER_CATEGORIES[item])
                            .join(" · "),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </>
                  )}
                </button>
              ))
            ) : (
              <p role="status" className="p-3 text-sm">
                Không tìm thấy người phù hợp.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
