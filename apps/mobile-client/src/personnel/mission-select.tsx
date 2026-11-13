import {
  Children,
  isValidElement,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { Dropdown } from "@org/ui";

// Keep mobile choices inside the dialog so they share its focus and scroll area.
export function MissionSelect({
  children,
  value,
  onValueChange,
  className,
  ...props
}: {
  children: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const options: { value: string; label: ReactNode; group?: string }[] = [];
  function collect(nodes: ReactNode, group?: string) {
    Children.forEach(nodes, (node) => {
      if (
        !isValidElement<{
          value?: string;
          label?: string;
          children?: ReactNode;
        }>(node)
      )
        return;
      if (node.type === "option") {
        options.push({
          value: node.props.value ?? "",
          label: node.props.children,
          group,
        });
      } else {
        collect(
          node.props.children,
          node.type === "optgroup" ? node.props.label : group,
        );
      }
    });
  }
  collect(children);
  return (
    <div className={className}>
      <div className="hidden md:block">
        <Dropdown
          {...props}
          value={value}
          className="w-full"
          onChange={(event) => onValueChange(event.target.value)}
        >
          {children}
        </Dropdown>
      </div>
      <div className="md:hidden">
        <Dropdown.Trigger
          indicator={false}
          {...props}
          ref={trigger}
          id={props.id ? `${props.id}-mobile` : undefined}
          type="button"
          aria-labelledby={props.id ? `${props.id}-label` : undefined}
          aria-expanded={expanded && !props.disabled}
          aria-controls={listId}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm disabled:opacity-50"
          onClick={() => setExpanded((open) => !open)}
        >
          <span>
            {options.find((option) => option.value === value)?.label ??
              "Chọn công tác"}
          </span>
          <ChevronDown size={16} className="shrink-0" />
        </Dropdown.Trigger>
        {expanded && !props.disabled && (
          <div
            id={listId}
            className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain rounded-lg border bg-white text-slate-950 p-2"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setExpanded(false);
                trigger.current?.focus();
              }
            }}
          >
            {options.map((option, index) => (
              <div key={option.value}>
                {option.group && option.group !== options[index - 1]?.group && (
                  <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                    {option.group}
                  </p>
                )}
                <button
                  type="button"
                  aria-pressed={option.value === value}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted aria-pressed:bg-muted"
                  onClick={() => {
                    onValueChange(option.value);
                    setExpanded(false);
                    trigger.current?.focus({ preventScroll: true });
                  }}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check size={16} className="shrink-0" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
