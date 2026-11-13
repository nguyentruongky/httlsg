import { useEffect, useRef } from "react";

export function useFieldEditorDismiss(disabled: boolean, onCancel: () => void) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (disabled) return;
    function dismiss(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element) || form.current?.contains(target))
        return;
      // A dropdown owns the dismissal gesture while its popup is open.
      // Do not unmount it before its outside-click guard can consume the click.
      if (
        form.current?.querySelector('[data-state="open"][aria-expanded="true"]')
      )
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
