export function dismissKeyboard() {
  const focused = document.activeElement;
  if (focused instanceof HTMLElement) focused.blur();
}
