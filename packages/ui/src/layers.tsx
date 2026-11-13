"use client";
import type { ComponentProps } from "react";
import {
  Dialog as DialogPrimitive,
  Popover as PopoverPrimitive,
} from "radix-ui";
import { preventDismissClickThrough } from "./dismiss-layer";

function NavigationContent({
  onPointerDownOutside,
  onClick,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Content
      {...props}
      onPointerDownOutside={(event) => {
        onPointerDownOutside?.(event);
        if (!event.defaultPrevented)
          preventDismissClickThrough(event.detail.originalEvent);
      }}
      onClick={(event) => {
        onClick?.(event);
        event.stopPropagation();
      }}
    />
  );
}
function PopoverContent({
  onPointerDownOutside,
  onClick,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Content
      {...props}
      onPointerDownOutside={(event) => {
        onPointerDownOutside?.(event);
        if (!event.defaultPrevented)
          preventDismissClickThrough(event.detail.originalEvent);
      }}
      onClick={(event) => {
        onClick?.(event);
        event.stopPropagation();
      }}
    />
  );
}
export const NavigationDialog = {
  ...DialogPrimitive,
  Content: NavigationContent,
};
export const Popover = { ...PopoverPrimitive, Content: PopoverContent };
