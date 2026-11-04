import type { ComponentProps } from "react";
import { Input } from "@org/ui";

export function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa cập nhật";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function DateInput({
  value,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="text"
      placeholder="ngày/tháng/năm"
      value={value ? formatDate(value) : ""}
      onChange={(event) => {
        const text = event.target.value;
        const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
        onChange(match ? `${match[3]}-${match[2]}-${match[1]}` : text);
      }}
    />
  );
}
