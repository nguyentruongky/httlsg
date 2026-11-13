"use client";
import { Dropdown } from "@org/ui";

export interface DropdownBoxProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "className"
> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DropdownBox({
  label,
  value,
  onChange,
  disabled,
  className,
  ...props
}: DropdownBoxProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <Dropdown
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={className}
        {...props}
      />
    </div>
  );
}
