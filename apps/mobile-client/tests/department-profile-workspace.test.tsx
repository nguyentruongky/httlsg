import { after, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { build } from "esbuild";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const cache = fileURLToPath(new URL("../../../.local-data/", import.meta.url));
await mkdir(cache, { recursive: true });
const temp = await mkdtemp(join(cache, "department-navigation-")),
  output = join(temp, "workspace.mjs");
await build({
  entryPoints: [
    fileURLToPath(
      new URL(
        "../src/department-profile-workspace.tsx",
        import.meta.url,
      ),
    ),
  ],
  outfile: output,
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  jsx: "automatic",
  plugins: [
    {
      name: "navigation-boundary",
      setup(builder) {
        builder.onResolve({ filter: /^react$/, namespace: "test" }, () => ({
          path: "react",
          external: true,
        }));
        builder.onResolve({ filter: /^next\/navigation$/ }, () => ({
          path: "navigation",
          namespace: "test",
        }));
        builder.onResolve(
          { filter: /\/mobile-client\/src\/member-detail$/ },
          () => ({ path: "profile", namespace: "test" }),
        );
        builder.onResolve({ filter: /^\.\/department-members$/ }, () => ({
          path: "roster",
          namespace: "test",
        }));
        builder.onLoad({ filter: /.*/, namespace: "test" }, (args) => {
          if (args.path === "navigation")
            return {
              contents: [
                'import {useSyncExternalStore} from "react";',
                "function url(){const s=globalThis.__departmentNavigation;return useSyncExternalStore(cb=>{s.listeners.add(cb);return()=>s.listeners.delete(cb)},()=>s.current,()=>s.current)}",
                "export function useRouter(){return globalThis.__departmentNavigation.router}",
                'export function usePathname(){return new URL(url(),"http://localhost").pathname}',
                'export function useSearchParams(){return new URL(url(),"http://localhost").searchParams}',
              ].join("\n"),
              loader: "js",
            };
          if (args.path === "profile")
            return {
              contents: [
                'import React from "react";',
                'export function MemberDetail(p){return React.createElement("div",{},',
                'React.createElement("p",{},"Chi tiết "+p.memberId),',
                'React.createElement("button",{onClick:()=>p.onOpenMember("relative")},"Mở người thân"),',
                'React.createElement("a",{href:p.returnHref,onClick:e=>{e.preventDefault();p.onBack()}},"Quay lại từ hồ sơ"))}',
              ].join("\n"),
              loader: "js",
            };
          return {
            contents: [
              'import React,{useState} from "react";',
              'export function DepartmentMembers(p){const [q,setQ]=useState("");return React.createElement("section",{},',
              'React.createElement("input",{"aria-label":"Bộ lọc danh sách",value:q,onChange:e=>setQ(e.target.value)}),',
              'React.createElement("a",{href:p.profileHref("one"),onClick:e=>{e.preventDefault();p.onOpenProfile("one")}},"Xem hồ sơ"))}',
            ].join("\n"),
            loader: "js",
          };
        });
      },
    },
  ],
});
const { DepartmentProfileWorkspace } = (await import(
  pathToFileURL(output).href
)) as typeof import("../src/department-profile-workspace");
const base = "/dashboard/settings/departments/thanh-nien";
const nav = {
  current: base,
  history: [base],
  listeners: new Set<() => void>(),
  router: {
    push(url: string) {
      nav.history.push(url);
      nav.current = url;
      nav.listeners.forEach((cb) => cb());
    },
    replace(url: string) {
      nav.history[nav.history.length - 1] = url;
      nav.current = url;
      nav.listeners.forEach((cb) => cb());
    },
    back() {
      if (nav.history.length > 1) nav.history.pop();
      nav.current = nav.history.at(-1)!;
      nav.listeners.forEach((cb) => cb());
    },
  },
};
Object.defineProperty(globalThis, "__departmentNavigation", {
  configurable: true,
  value: nav,
});
const scrollTo = window.scrollTo;
const originalMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
afterEach(() => {
  cleanup();
  window.scrollTo = scrollTo;
  if (originalMedia) Object.defineProperty(window, "matchMedia", originalMedia);
  else Reflect.deleteProperty(window, "matchMedia");
});
after(async () => {
  Reflect.deleteProperty(globalThis, "__departmentNavigation");
  await rm(temp, { recursive: true, force: true });
});
function setup(deep = false) {
  nav.history = deep ? ["/client", base + "?member=one"] : [base];
  nav.current = nav.history.at(-1)!;
  window.scrollTo = () => {};
  render(
    <DepartmentProfileWorkspace
      department={{ id: "thanh-nien", name: "Ban Thanh niên" }}
    />,
  );
}
test("department profile uses a desktop split pane and mobile pushed screen while retaining the source list", async () => {
  setup();
  const user = userEvent.setup();
  const input = screen.getByRole("textbox", {
    name: "Bộ lọc danh sách",
  }) as HTMLInputElement;
  await user.type(input, "An");
  await user.click(screen.getByRole("link", { name: "Xem hồ sơ" }));
  assert.equal(nav.current, base + "?member=one");
  const pane = screen.getByRole("complementary", {
    name: "Hồ sơ thành viên Ban ngành",
  });
  assert.ok(pane.className.includes("fixed"));
  assert.ok(pane.className.includes("lg:sticky"));
  assert.ok(pane.className.includes("lg:overflow-y-auto"));
  assert.ok(pane.className.includes("lg:max-h-"));
  assert.ok(pane.className.includes("lg:top-24"));
  assert.ok(pane.className.includes("lg:self-start"));
  const rosterPane = pane.parentElement!.firstElementChild as HTMLElement;
  assert.ok(!rosterPane.className.includes("overflow-y-auto"));
  assert.ok(!rosterPane.className.includes("max-h-"));
  assert.ok(pane.parentElement!.className.includes("lg:grid-cols-"));
  assert.equal(
    screen.getByRole("textbox", { name: "Bộ lọc danh sách" }),
    input,
  );
  await user.click(
    screen.getByRole("button", { name: "Về danh sách Ban Thanh niên" }),
  );
  assert.equal(nav.current, base);
  assert.equal(screen.queryByRole("complementary"), null);
  assert.equal(input.value, "An");
});
test("family profile navigation keeps back anchored to the department list", async () => {
  setup();
  const user = userEvent.setup();
  await user.click(screen.getByRole("link", { name: "Xem hồ sơ" }));
  await user.click(screen.getByRole("button", { name: "Mở người thân" }));
  assert.equal(nav.current, base + "?member=relative");
  assert.equal(nav.history.length, 2);
  await user.click(screen.getByRole("link", { name: "Quay lại từ hồ sơ" }));
  assert.equal(nav.current, base);
});
test("back from a direct profile URL returns to this department instead of the previous client page", async () => {
  setup(true);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Về danh sách Ban Thanh niên" }),
  );
  assert.equal(nav.current, base);
  assert.notEqual(nav.current, "/client");
});
test("browser back restores the original department list without remounting it", async () => {
  setup();
  const user = userEvent.setup();
  const input = screen.getByRole("textbox", {
    name: "Bộ lọc danh sách",
  }) as HTMLInputElement;
  await user.type(input, "Bình");
  await user.click(screen.getByRole("link", { name: "Xem hồ sơ" }));
  await act(async () => nav.router.back());
  assert.equal(
    input,
    screen.getByRole("textbox", { name: "Bộ lọc danh sách" }),
  );
  assert.equal(input.value, "Bình");
});

function media(mobile: boolean, reduced = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) =>
      ({
        matches: query.includes("reduced-motion")
          ? reduced
          : query.includes("max-width")
            ? mobile
            : !mobile,
        media: query,
      }) as MediaQueryList,
  });
}
test("mobile back slides the retained profile right before removing it and restores the source list", async () => {
  media(true);
  setup();
  const user = userEvent.setup();
  const input = screen.getByRole("textbox", {
    name: "Bộ lọc danh sách",
  }) as HTMLInputElement;
  await user.type(input, "An");
  await user.click(screen.getByRole("link", { name: "Xem hồ sơ" }));
  assert.ok(
    document.documentElement.classList.contains("department-profile-open"),
  );
  const pane = screen.getByRole("complementary", {
    name: "Hồ sơ thành viên Ban ngành",
  });
  await user.click(
    screen.getByRole("button", { name: "Về danh sách Ban Thanh niên" }),
  );
  assert.equal(nav.current, base);
  assert.equal(pane.isConnected, true);
  assert.equal(pane.getAttribute("data-exiting"), "true");
  assert.equal(pane.hasAttribute("inert"), true);
  assert.equal(input.value, "An");
  await waitFor(() => assert.equal(pane.isConnected, false));
  assert.equal(
    document.documentElement.classList.contains("department-profile-open"),
    false,
  );
});
test("mobile browser Back uses the same outgoing transition", async () => {
  media(true);
  setup();
  const user = userEvent.setup();
  await user.click(screen.getByRole("link", { name: "Xem hồ sơ" }));
  const pane = screen.getByRole("complementary", {
    name: "Hồ sơ thành viên Ban ngành",
  });
  await act(async () => nav.router.back());
  assert.equal(pane.getAttribute("data-exiting"), "true");
  await waitFor(() => assert.equal(pane.isConnected, false));
});
test("desktop and reduced-motion back close immediately without translated overflow", async () => {
  for (const [mobile, reduced] of [
    [false, false],
    [true, true],
  ]) {
    media(mobile, reduced);
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "Xem hồ sơ" }));
    const pane = screen.getByRole("complementary", {
      name: "Hồ sơ thành viên Ban ngành",
    });
    assert.ok(pane.className.includes("overflow-x-hidden"));
    assert.ok(pane.className.includes("overscroll-x-none"));
    assert.ok(pane.parentElement?.className.includes("max-w-full"));
    await user.click(
      screen.getByRole("button", { name: "Về danh sách Ban Thanh niên" }),
    );
    assert.equal(pane.isConnected, false);
    cleanup();
  }
});
