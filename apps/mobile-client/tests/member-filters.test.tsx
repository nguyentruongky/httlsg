import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemberFilters,
  emptyMemberFilters,
  type MemberFiltersValue,
} from "../src/member-filters";
afterEach(cleanup);
function Harness({
  onApply,
}: {
  onApply: (value: MemberFiltersValue) => void;
}) {
  const [open, setOpen] = useState(true),
    [value, setValue] = useState(emptyMemberFilters);
  return (
    <>
      <button onClick={() => setOpen(true)}>Mở bộ lọc</button>
      <MemberFilters
        open={open}
        onOpenChange={setOpen}
        value={value}
        onApply={(v) => {
          setValue(v);
          onApply(v);
        }}
      />
    </>
  );
}
test("filter selections use full-page navigation and apply the draft together", async () => {
  let applied: MemberFiltersValue | undefined;
  const user = userEvent.setup();
  render(<Harness onApply={(v) => (applied = v)} />);
  await screen.findByRole("dialog", { name: "Bộ lọc" });
  await user.click(screen.getByRole("button", { name: /^Ban ngành/ }));
  let page = await screen.findByRole("dialog", { name: "Ban ngành" });
  assert.equal(
    document.querySelector("[data-radix-popper-content-wrapper]"),
    null,
  );
  await user.click(
    within(page).getByRole("checkbox", { name: "Ban Thanh niên" }),
  );
  await user.click(
    within(page).getByRole("checkbox", { name: "Ban Truyền thông" }),
  );
  assert.equal(applied, undefined);
  await user.click(within(page).getByRole("button", { name: "Xong" }));
  await user.click(screen.getByRole("button", { name: /^Khu vực/ }));
  page = await screen.findByRole("dialog", { name: "Khu vực" });
  await user.click(within(page).getByRole("button", { name: "KV13" }));
  await user.click(screen.getByRole("button", { name: /^Phường\/xã/ }));
  page = await screen.findByRole("dialog", { name: "Phường/xã" });
  await user.type(
    within(page).getByRole("searchbox", { name: "Tìm phường/xã" }),
    "sai gon",
  );
  await user.click(
    within(page).getByRole("button", { name: "Phường Sài Gòn" }),
  );
  await user.click(screen.getByRole("button", { name: /^Khoảng tuổi/ }));
  page = await screen.findByRole("dialog", { name: "Khoảng tuổi" });
  await user.type(
    within(page).getByRole("spinbutton", { name: "Tuổi từ" }),
    "18",
  );
  await user.type(
    within(page).getByRole("spinbutton", { name: "Tuổi đến" }),
    "35",
  );
  await user.click(within(page).getByRole("button", { name: "Xong" }));
  await user.click(screen.getByRole("button", { name: "Áp dụng" }));
  assert.deepEqual(applied, {
    departmentIds: ["thanh-nien", "truyen-thong"],
    area: "KV13",
    location: "Phường Sài Gòn",
    minAge: 18,
    maxAge: 35,
    ageUnknownOnly: false,
  });
  assert.equal(screen.queryByRole("dialog"), null);
});
test("back and Escape preserve in-screen choices but closing discards unapplied changes", async () => {
  let applied = 0;
  const user = userEvent.setup();
  render(<Harness onApply={() => applied++} />);
  await user.click(screen.getByRole("button", { name: /^Ban ngành/ }));
  await user.click(screen.getByRole("checkbox", { name: "Ban Thanh niên" }));
  await user.keyboard("{Escape}");
  await screen.findByRole("dialog", { name: "Bộ lọc" });
  await user.click(screen.getByRole("button", { name: /^Ban ngành/ }));
  assert.equal(
    (
      screen.getByRole("checkbox", {
        name: "Ban Thanh niên",
      }) as HTMLInputElement
    ).checked,
    true,
  );
  await user.click(screen.getByRole("button", { name: "Quay lại bộ lọc" }));
  await user.click(screen.getByRole("button", { name: "Đóng bộ lọc" }));
  assert.equal(applied, 0);
  await user.click(screen.getByRole("button", { name: "Mở bộ lọc" }));
  await user.click(screen.getByRole("button", { name: /^Ban ngành/ }));
  assert.equal(
    (
      screen.getByRole("checkbox", {
        name: "Ban Thanh niên",
      }) as HTMLInputElement
    ).checked,
    false,
  );
});
test("age screen rejects reversed bounds and reset clears the range", async () => {
  let applied: MemberFiltersValue | undefined;
  const user = userEvent.setup();
  render(<Harness onApply={(v) => (applied = v)} />);
  await user.click(screen.getByRole("button", { name: /^Khoảng tuổi/ }));
  await user.type(screen.getByRole("spinbutton", { name: "Tuổi từ" }), "60");
  await user.type(screen.getByRole("spinbutton", { name: "Tuổi đến" }), "18");
  await user.click(screen.getByRole("button", { name: "Xong" }));
  assert.match(
    screen.getByRole("alert").textContent ?? "",
    /không được lớn hơn/,
  );
  assert.equal(applied, undefined);
  await user.click(screen.getByRole("button", { name: "Từ 50 tuổi" }));
  await user.click(screen.getByRole("button", { name: "Xong" }));
  await user.click(screen.getByRole("button", { name: "Đặt lại" }));
  await user.click(screen.getByRole("button", { name: "Áp dụng" }));
  assert.deepEqual(applied, emptyMemberFilters);
});

test("location navigation focuses the title without opening the search keyboard", async () => {
  const user = userEvent.setup();
  render(<Harness onApply={() => {}} />);
  await user.click(screen.getByRole("button", { name: /^Phường\/xã/ }));
  const heading = screen.getByRole("heading", { name: "Phường/xã" });
  const input = screen.getByRole("searchbox", { name: "Tìm phường/xã" });
  assert.equal(document.activeElement, heading);
  assert.notEqual(document.activeElement, input);
  await user.click(input);
  assert.equal(document.activeElement, input);
});
test("requested age presets apply their exact inclusive bounds", async () => {
  const presets = [
    ["0–12 tuổi", 0, 12],
    ["13–18 tuổi", 13, 18],
    ["19–30 tuổi", 19, 30],
    ["30–40 tuổi", 30, 40],
    ["40–50 tuổi", 40, 50],
    ["Từ 50 tuổi", 50, null],
  ] as const;
  for (const [label, minAge, maxAge] of presets) {
    let applied: MemberFiltersValue | undefined;
    const user = userEvent.setup();
    const view = render(<Harness onApply={(v) => (applied = v)} />);
    await user.click(screen.getByRole("button", { name: /^Khoảng tuổi/ }));
    await user.click(screen.getByRole("button", { name: label }));
    await user.click(screen.getByRole("button", { name: "Xong" }));
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
    assert.deepEqual(applied, { ...emptyMemberFilters, minAge, maxAge });
    view.unmount();
  }
});

test("unknown-age preset replaces numeric bounds, persists, and can switch back to a range", async () => {
  const user = userEvent.setup();
  const applied: MemberFiltersValue[] = [];
  render(<Harness onApply={(v) => applied.push(v)} />);
  await user.click(screen.getByRole("button", { name: /^Khoảng tuổi/ }));
  await user.click(screen.getByRole("button", { name: "19–30 tuổi" }));
  await user.click(
    screen.getByRole("button", { name: "Không có dữ liệu tuổi" }),
  );
  assert.equal(
    (screen.getByRole("spinbutton", { name: "Tuổi từ" }) as HTMLInputElement)
      .value,
    "",
  );
  assert.equal(
    screen
      .getByRole("button", { name: "Tất cả độ tuổi" })
      .getAttribute("aria-pressed"),
    "false",
  );
  await user.click(screen.getByRole("button", { name: "Xong" }));
  assert.ok(
    screen.getByRole("button", { name: /^Khoảng tuổi Không có dữ liệu tuổi/ }),
  );
  await user.click(screen.getByRole("button", { name: "Áp dụng" }));
  assert.deepEqual(applied[0], { ...emptyMemberFilters, ageUnknownOnly: true });
  await user.click(screen.getByRole("button", { name: "Mở bộ lọc" }));
  await user.click(screen.getByRole("button", { name: /^Khoảng tuổi/ }));
  assert.equal(
    screen
      .getByRole("button", { name: "Không có dữ liệu tuổi" })
      .getAttribute("aria-pressed"),
    "true",
  );
  await user.click(screen.getByRole("button", { name: "0–12 tuổi" }));
  await user.click(screen.getByRole("button", { name: "Xong" }));
  await user.click(screen.getByRole("button", { name: "Áp dụng" }));
  assert.deepEqual(applied[1], {
    ...emptyMemberFilters,
    minAge: 0,
    maxAge: 12,
  });
});
