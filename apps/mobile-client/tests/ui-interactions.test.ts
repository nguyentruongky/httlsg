import assert from "node:assert/strict";
import { after, afterEach, test, mock } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement, useState } from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test",
});
for (const [key, value] of Object.entries({
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  IS_REACT_ACT_ENVIRONMENT: true,
}))
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } =
  await import("@tanstack/react-query");
const { usePersonnel } = await import("../src/personnel/use-personnel");
const { downloadCsv } = await import("../src/csv-export");
const { Input } = await import("../../../packages/ui/src/input");
const { InlineMemberField } = await import("../src/inline-member-field");
const { useDialogViewport } =
  await import("../../../packages/ui/src/use-dialog-viewport");
const container = document.createElement("div");
document.body.append(container);
let root = createRoot(container);
afterEach(async () => {
  await act(async () => root.unmount());
  container.replaceChildren();
  document
    .querySelectorAll("[data-responsive-menu]")
    .forEach((node) => node.remove());
  root = createRoot(container);
});
after(async () => {
  await act(async () => root.unmount());
  dom.window.close();
});

function keyboard(input: HTMLInputElement, init: KeyboardEventInit = {}) {
  input.focus();
  return input.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}
function visible(input: HTMLInputElement) {
  input.getClientRects = () =>
    [input.getBoundingClientRect()] as unknown as DOMRectList;
}

test("Enter skips disabled, readonly and hidden fields without submitting", async () => {
  let submissions = 0;
  await act(async () =>
    root.render(
      createElement(
        "form",
        {
          onSubmit: (event) => {
            event.preventDefault();
            submissions++;
          },
        },
        createElement(Input, { "aria-label": "First" }),
        createElement(Input, { disabled: true }),
        createElement(Input, { readOnly: true }),
        createElement(Input, { type: "hidden" }),
        createElement(Input, { "aria-label": "Last" }),
      ),
    ),
  );
  const inputs = Array.from(container.querySelectorAll("input"));
  inputs.forEach(visible);
  assert.equal(keyboard(inputs[0]), false);
  assert.equal(document.activeElement, inputs[4]);
  assert.equal(submissions, 0);
  assert.equal(keyboard(inputs[4]), true);
});

test("search, composition, modifier keys and custom handlers retain Enter behavior", async () => {
  await act(async () =>
    root.render(
      createElement(
        "form",
        null,
        createElement(Input, { type: "search" }),
        createElement(Input, { onKeyDown: (event) => event.preventDefault() }),
        createElement(Input),
        createElement(Input),
      ),
    ),
  );
  const inputs = Array.from(container.querySelectorAll("input"));
  inputs.forEach(visible);
  assert.equal(keyboard(inputs[0]), true);
  assert.equal(document.activeElement, inputs[0]);
  assert.equal(keyboard(inputs[1]), false);
  assert.equal(document.activeElement, inputs[1]);
  for (const init of [
    { isComposing: true },
    { shiftKey: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
  ]) {
    assert.equal(keyboard(inputs[2], init), true);
    assert.equal(document.activeElement, inputs[2]);
  }
});

test("profile editor ignores inside and dropdown clicks, dismisses outside, and cleans up", async () => {
  let dismissals = 0;
  const props = {
    label: "Họ tên",
    icon: () => null,
    value: "Example",
    display: "Example",
    editable: true,
    editing: true,
    disabled: false,
    onStart: () => {},
    onCancel: () => {
      dismissals++;
    },
    onSave: async () => {},
  };
  await act(async () =>
    root.render(createElement(InlineMemberField<string>, props)),
  );
  const input = container.querySelector("input")!;
  input.dispatchEvent(
    new dom.window.MouseEvent("pointerdown", { bubbles: true }),
  );
  const menu = document.createElement("div");
  menu.dataset.responsiveMenu = "true";
  document.body.append(menu);
  menu.dispatchEvent(
    new dom.window.MouseEvent("pointerdown", { bubbles: true }),
  );
  assert.equal(dismissals, 0);
  await act(async () => {
    document.body.dispatchEvent(
      new dom.window.MouseEvent("pointerdown", { bubbles: true }),
    );
  });
  assert.equal(dismissals, 1);
  await act(async () =>
    root.render(
      createElement(InlineMemberField<string>, { ...props, disabled: true }),
    ),
  );
  document.body.dispatchEvent(
    new dom.window.MouseEvent("pointerdown", { bubbles: true }),
  );
  assert.equal(dismissals, 1);
  await act(async () => root.render(null));
  document.body.dispatchEvent(
    new dom.window.MouseEvent("pointerdown", { bubbles: true }),
  );
  assert.equal(dismissals, 1);
});

test("clicking a different editable profile field switches without saving", async () => {
  let saves = 0;
  function Profile() {
    const [active, setActive] = useState<string | null>("First");
    return createElement(
      "dl",
      null,
      ...["First", "Second"].map((label) =>
        createElement(InlineMemberField<string>, {
          key: label,
          label,
          icon: () => null,
          value: label,
          display: label,
          editable: true,
          editing: active === label,
          disabled: false,
          onStart: () => setActive(label),
          onCancel: () => setActive(null),
          onSave: async () => {
            saves++;
          },
        }),
      ),
    );
  }
  await act(async () => root.render(createElement(Profile)));
  const target = container.querySelector<HTMLButtonElement>(
    '[aria-label="Sửa Second"]',
  )!;
  await act(async () => {
    target.dispatchEvent(
      new dom.window.MouseEvent("pointerdown", { bubbles: true }),
    );
  });
  await act(async () => target.click());
  assert.equal(
    container.querySelector("form")?.getAttribute("aria-label"),
    "Chỉnh sửa Second",
  );
  assert.equal(saves, 0);
});

test("dialog viewport sizing and focused-input scrolling survive keyboard resize", async () => {
  const viewport = Object.assign(new dom.window.EventTarget(), {
    height: 500,
    offsetTop: 40,
  });
  Object.defineProperty(window, "visualViewport", {
    value: viewport,
    configurable: true,
  });
  function Viewport() {
    const ref = useDialogViewport(true);
    return createElement("div", { ref }, createElement("input"));
  }
  await act(async () => root.render(createElement(Viewport)));
  const content = container.firstElementChild as HTMLDivElement;
  assert.equal(
    content.style.getPropertyValue("--dialog-viewport-height"),
    "500px",
  );
  assert.equal(
    content.style.getPropertyValue("--dialog-viewport-center"),
    "290px",
  );
  let scrolls = 0;
  const input = content.querySelector("input")!;
  input.scrollIntoView = () => {
    scrolls++;
  };
  input.focus();
  viewport.height = 300;
  viewport.offsetTop = 20;
  viewport.dispatchEvent(new dom.window.Event("resize"));
  assert.equal(
    content.style.getPropertyValue("--dialog-viewport-height"),
    "300px",
  );
  assert.equal(
    content.style.getPropertyValue("--dialog-viewport-center"),
    "170px",
  );
  assert.equal(scrolls, 1);
  await act(async () => root.render(null));
  viewport.dispatchEvent(new dom.window.Event("resize"));
  assert.equal(scrolls, 1);
});

test("CSV download preserves UTF-8 BOM, filename, MIME type and object URL cleanup", async () => {
  const create = mock.method(URL, "createObjectURL", () => "blob:test-csv");
  const revoke = mock.method(URL, "revokeObjectURL", () => {});
  let filename = "";
  let href = "";
  const click = mock.method(
    dom.window.HTMLAnchorElement.prototype,
    "click",
    function (this: HTMLAnchorElement) {
      filename = this.download;
      href = this.href;
    },
  );
  try {
    const csv = '"Họ tên"\r\n"Ví dụ"';
    downloadCsv(csv, "members.csv");
    const blob = create.mock.calls[0].arguments[0];
    assert.ok(blob instanceof Blob);
    assert.equal(blob.type, "text/csv;charset=utf-8");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    assert.deepEqual(Array.from(bytes.slice(0, 3)), [239, 187, 191]);
    assert.equal(new TextDecoder().decode(bytes.slice(3)), csv);
    assert.equal(filename, "members.csv");
    assert.equal(href, "blob:test-csv");
    assert.equal(revoke.mock.calls[0].arguments[0], "blob:test-csv");
  } finally {
    create.mock.restore();
    revoke.mock.restore();
    click.mock.restore();
  }
});

test("personnel query keeps filters and debounce behavior, without retaining a different account's rows", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  let requests = 0;
  let release: ((response: Response) => void) | undefined;
  const fetch = mock.method(globalThis, "fetch", async () => {
    requests++;
    if (requests === 1)
      return new Response(
        JSON.stringify({ items: [{ id: "account-A-member" }], total: 1 }),
      );
    return new Promise<Response>((resolve) => {
      release = resolve;
    });
  });
  function Personnel({
    userId,
    search = "query",
  }: {
    userId: string;
    search?: string;
  }) {
    const { query } = usePersonnel({
      userId,
      search,
      term: "query",
      roles: ["deacon"],
      departmentIds: ["thieu-nien"],
    });
    return createElement(
      "output",
      null,
      query.data?.pages[0].items.map((item) => item.id).join(",") ?? "pending",
    );
  }
  const render = (userId: string, search?: string) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(Personnel, { userId, search }),
    );
  const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
  try {
    await act(async () => root.render(render("account-A")));
    await act(tick);
    assert.equal(container.textContent, "account-A-member");
    await act(async () => root.render(render("account-B")));
    assert.equal(container.textContent, "pending");
    assert.equal(requests, 2);
    await act(async () => {
      release?.(
        new Response(
          JSON.stringify({ items: [{ id: "account-B-member" }], total: 1 }),
        ),
      );
      await tick();
    });
    await act(tick);
    assert.equal(container.textContent, "account-B-member");
    await act(async () => root.render(render("account-B", "still typing")));
    assert.equal(requests, 2);
  } finally {
    await act(async () => root.render(null));
    client.clear();
    fetch.mock.restore();
  }
});
