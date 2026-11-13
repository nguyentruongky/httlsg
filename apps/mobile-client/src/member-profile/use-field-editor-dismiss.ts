import { useEffect, useRef } from "react";

export function useFieldEditorDismiss(disabled: boolean, onCancel: () => void) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (disabled) return;
    function dismiss(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element) || form.current?.contains(target))
        return;
      // Dropdown options can be rendered in a portal outside the form.
      if (target.closest('[data-responsive-menu="true"]')) return;
      onCancel();
    }
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [disabled, onCancel]);
  return form;
}
