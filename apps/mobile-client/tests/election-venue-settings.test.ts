import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { validVenueCoordinates } from "../src/elections/public/venue-state";

test("venue coordinate validation accepts boundaries and rejects missing, nonfinite and out-of-range values", () => {
  const point = (lat: string, lng: string) => ({
    lat,
    lng,
    address: "",
    radiusM: "500",
  });
  for (const [lat, lng] of [
    ["0", "0"],
    ["90", "180"],
    ["-90", "-180"],
    ["10.732654", "106.650324"],
  ])
    assert.equal(validVenueCoordinates(point(lat, lng)), true);
  for (const [lat, lng] of [
    ["", "106"],
    ["10", " "],
    ["91", "106"],
    ["10", "181"],
    ["Infinity", "106"],
    ["abc", "106"],
  ])
    assert.equal(validVenueCoordinates(point(lat, lng)), false);
});

test("venue settings modes, radius controls, address selection and save states", async (t) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
    pretendToBeVisual: true,
  });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    NodeFilter: dom.window.NodeFilter,
    CustomEvent: dom.window.CustomEvent,
    Element: dom.window.Element,
    Node: dom.window.Node,
    DocumentFragment: dom.window.DocumentFragment,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ items: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  const { render, screen, fireEvent, cleanup, waitFor } =
    await import("@testing-library/react");
  const { LocationSettingsForm } =
    await import("../src/elections/public/location-settings-form");
  const config = {
    id: "session",
    enabled: true,
    latitude: 10.732654,
    longitude: 106.650324,
    radiusMeters: 500,
    maximumAccuracyMeters: 50,
    version: 2,
    voteCount: 0,
  };
  const mount = (
    value: typeof config | null,
    onSave: (input: any) => Promise<boolean | void> = async () => true,
  ) =>
    render(
      createElement(LocationSettingsForm, {
        config: value,
        onSave,
        busy: false,
      }),
    );
  try {
    await t.test(
      "saved location starts in view, hides location lookup, and disables the clean save",
      async () => {
        mount(config);
        assert.ok(screen.getByRole("heading", { name: "Nơi tổ chức bầu cử" }));
        assert.equal(
          screen.queryByRole("button", { name: "Dùng vị trí hiện tại" }),
          null,
        );
        assert.equal(
          (
            screen.getByRole("button", {
              name: "Đã lưu",
            }) as HTMLButtonElement
          ).disabled,
          true,
        );
        assert.ok(screen.getByText("10.732654, 106.650324"));
        assert.equal(
          screen.queryByText(
            "Địa điểm đã được lưu. Chỉ cần lưu lại khi muốn thay đổi.",
          ),
          null,
        );
        cleanup();
      },
    );
    await t.test(
      "radius chips and custom input stay synchronized and detect reverted edits",
      async () => {
        mount(config);
        fireEvent.click(screen.getByRole("button", { name: "1000 m" }));
        assert.equal(
          (screen.getByLabelText("Khoảng cách tùy chỉnh") as HTMLInputElement)
            .value,
          "1000",
        );
        assert.equal(
          (
            screen.getByRole("button", {
              name: "Lưu thay đổi",
            }) as HTMLButtonElement
          ).disabled,
          false,
        );
        fireEvent.change(screen.getByLabelText("Khoảng cách tùy chỉnh"), {
          target: { value: "1500" },
        });
        assert.equal(
          screen
            .getByRole("button", { name: "1500 m" })
            .getAttribute("aria-pressed"),
          "true",
        );
        fireEvent.change(screen.getByLabelText("Khoảng cách tùy chỉnh"), {
          target: { value: "500" },
        });
        assert.equal(
          (
            screen.getByRole("button", {
              name: "Đã lưu",
            }) as HTMLButtonElement
          ).disabled,
          true,
        );
        cleanup();
      },
    );
    await t.test(
      "new location starts in edit without Cancel; coordinate validation gates saving",
      async () => {
        const saved: any[] = [];
        mount(null, async (input) => {
          saved.push(input);
          return true;
        });
        assert.ok(screen.getByRole("heading", { name: "Chọn nơi tổ chức" }));
        assert.equal(screen.queryByRole("button", { name: "Hủy" }), null);
        assert.ok(screen.getByRole("button", { name: "Dùng vị trí hiện tại" }));
        fireEvent.click(screen.getByText("Nhập tọa độ thủ công"));
        fireEvent.change(screen.getByLabelText("Vĩ độ"), {
          target: { value: "91" },
        });
        fireEvent.change(screen.getByLabelText("Kinh độ"), {
          target: { value: "106.65" },
        });
        assert.equal(
          (
            screen.getByRole("button", {
              name: "Lưu địa điểm",
            }) as HTMLButtonElement
          ).disabled,
          true,
        );
        fireEvent.change(screen.getByLabelText("Vĩ độ"), {
          target: { value: "10.73" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Lưu địa điểm" }));
        await waitFor(() =>
          assert.ok(
            screen.getByRole("heading", { name: "Nơi tổ chức bầu cử" }),
          ),
        );
        assert.equal(saved.length, 1);
        assert.equal(saved[0].latitude, 10.73);
        assert.equal(saved[0].longitude, 106.65);
        assert.equal(saved[0].maximumAccuracyMeters, 50);
        assert.equal(saved[0].version, 0);
        cleanup();
      },
    );
    await t.test(
      "a failed save retains edit mode and the chosen location",
      async () => {
        mount(config, async () => false);
        fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
        fireEvent.click(screen.getByRole("button", { name: "Lưu địa điểm" }));
        await waitFor(() =>
          assert.equal(
            (
              screen.getByRole("button", {
                name: "Lưu địa điểm",
              }) as HTMLButtonElement
            ).disabled,
            false,
          ),
        );
        assert.ok(screen.getByRole("heading", { name: "Chọn nơi tổ chức" }));
        cleanup();
      },
    );
    await t.test(
      "Cancel warns before discarding a changed saved location",
      async () => {
        mount(config);
        fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
        fireEvent.click(screen.getByText("Nhập tọa độ thủ công"));
        fireEvent.change(screen.getByLabelText("Vĩ độ"), {
          target: { value: "10.74" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
        assert.ok(
          await screen.findByRole("dialog", { name: "Bỏ thay đổi địa điểm?" }),
        );
        fireEvent.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
        await waitFor(() =>
          assert.ok(
            screen.getByRole("heading", { name: "Nơi tổ chức bầu cử" }),
          ),
        );
        assert.ok(screen.getByText("10.732654, 106.650324"));
        cleanup();
      },
    );
    await t.test(
      "autocomplete supports keyboard selection and requires a new selection after typing",
      async () => {
        const place = {
          lat: 10.73,
          lng: 106.65,
          name: "Nhà thờ",
          detail: "Quận 8, Hồ Chí Minh",
          address: "Nhà thờ, Quận 8, Hồ Chí Minh",
        };
        globalThis.fetch = async () =>
          new Response(JSON.stringify({ items: [place] }), {
            headers: { "Content-Type": "application/json" },
          });
        mount(null);
        const input = screen.getByRole("combobox");
        fireEvent.change(input, { target: { value: "Nhà thờ" } });
        await screen.findByRole("option");
        fireEvent.keyDown(input, { key: "ArrowDown" });
        assert.ok(input.getAttribute("aria-activedescendant"));
        fireEvent.keyDown(input, { key: "Enter" });
        assert.ok(screen.getByText("10.730000, 106.650000"));
        assert.equal(
          (
            screen.getByRole("button", {
              name: "Lưu địa điểm",
            }) as HTMLButtonElement
          ).disabled,
          false,
        );
        fireEvent.change(input, { target: { value: "Địa chỉ khác" } });
        assert.equal(
          (
            screen.getByRole("button", {
              name: "Lưu địa điểm",
            }) as HTMLButtonElement
          ).disabled,
          true,
        );
        cleanup();
      },
    );
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
