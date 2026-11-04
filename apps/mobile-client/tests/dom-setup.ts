import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html lang='vi'><body></body></html>", {
  url: "http://localhost:5173",
  pretendToBeVisual: true,
});
for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLFieldSetElement",
  "Element",
  "Node",
  "NodeFilter",
  "DocumentFragment",
  "SVGElement",
  "MutationObserver",
  "Event",
  "CustomEvent",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
]) {
  const value =
    name === "window"
      ? dom.window
      : (dom.window as unknown as Record<string, unknown>)[name];
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}
Object.defineProperty(globalThis, "getComputedStyle", {
  value: dom.window.getComputedStyle.bind(dom.window),
  configurable: true,
});
Object.defineProperty(globalThis, "requestAnimationFrame", {
  value: dom.window.requestAnimationFrame.bind(dom.window),
  configurable: true,
});
Object.defineProperty(globalThis, "cancelAnimationFrame", {
  value: dom.window.cancelAnimationFrame.bind(dom.window),
  configurable: true,
});
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  value: true,
  configurable: true,
  writable: true,
});
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, "ResizeObserver", {
  value: ResizeObserverStub,
  configurable: true,
});
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLElement.prototype.hasPointerCapture = () => false;
dom.window.HTMLElement.prototype.setPointerCapture = () => {};
dom.window.HTMLElement.prototype.releasePointerCapture = () => {};
