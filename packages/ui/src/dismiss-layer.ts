// Consume the gesture that dismisses a layer, including a click synthesized after
// its overlay unmounts. A later click or keyboard activation remains available.
let clearPendingClick: (() => void) | undefined;
export function preventDismissClickThrough(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  if (!("clientX" in event) || !("clientY" in event)) return;
  clearPendingClick?.();
  const { clientX, clientY } = event as MouseEvent;
  const clear = () => {
    document.removeEventListener("click", consume, true);
    window.clearTimeout(timer);
    if (clearPendingClick === clear) clearPendingClick = undefined;
  };
  const consume = (click: MouseEvent) => {
    if (
      click.detail === 0 ||
      Math.abs(click.clientX - clientX) > 8 ||
      Math.abs(click.clientY - clientY) > 8
    )
      return;
    click.preventDefault();
    click.stopImmediatePropagation();
    clear();
  };
  const timer = window.setTimeout(clear, 500);
  clearPendingClick = clear;
  document.addEventListener("click", consume, true);
}
