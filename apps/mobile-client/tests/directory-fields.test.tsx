import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { useState } from "react";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "@org/ui";
import {
  DepartmentChoices,
  LocationPicker,
  AreaPicker,
} from "../src/directory-fields";
afterEach(cleanup);
function Filters({ onSubmit = () => {} }: { onSubmit?: () => void }) {
  const [departments, setDepartments] = useState<string[]>([]),
    [location, setLocation] = useState("all"),
    [area, setArea] = useState("all");
  return (
    <Dialog
      open
      title="Bộ lọc"
      description="Chọn điều kiện tìm kiếm."
      closeLabel="Đóng"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <DepartmentChoices value={departments} onChange={setDepartments} />
        <LocationPicker value={location} onChange={setLocation} />
        <AreaPicker value={area} onChange={setArea} />
        <button type="submit">Áp dụng</button>
      </form>
    </Dialog>
  );
}
test("departments use a custom multi-select and retain selections without submitting the form", async () => {
  let submitted = 0;
  const user = userEvent.setup();
  render(<Filters onSubmit={() => submitted++} />);
  const trigger = screen.getByRole("button", { name: /^Ban ngành/ });
  await user.click(trigger);
  const panel = await screen.findByRole("dialog", { name: "Ban ngành" });
  await user.click(
    within(panel).getByRole("checkbox", { name: "Ban Lão niên" }),
  );
  await user.click(
    within(panel).getByRole("checkbox", { name: "Ban Thanh niên" }),
  );
  assert.equal(
    (
      within(panel).getByRole("checkbox", {
        name: "Ban Lão niên",
      }) as HTMLInputElement
    ).checked,
    true,
  );
  assert.equal(
    (
      within(panel).getByRole("checkbox", {
        name: "Ban Thanh niên",
      }) as HTMLInputElement
    ).checked,
    true,
  );
  await user.click(within(panel).getByRole("button", { name: "Xong" }));
  assert.equal(screen.queryByRole("dialog", { name: "Ban ngành" }), null);
  assert.match(trigger.textContent ?? "", /2 ban ngành/);
  assert.equal(submitted, 0);
  await user.click(trigger);
  const reopened = await screen.findByRole("dialog", { name: "Ban ngành" });
  await user.click(
    within(reopened).getByRole("button", { name: "Bỏ chọn tất cả" }),
  );
  assert.equal(
    (
      within(reopened).getByRole("checkbox", {
        name: "Ban Lão niên",
      }) as HTMLInputElement
    ).checked,
    false,
  );
  await user.keyboard("{Escape}");
  await waitFor(() => assert.equal(document.activeElement, trigger));
});
test("location search is inside the custom panel and supports accent-insensitive selection", async () => {
  let submitted = 0;
  const user = userEvent.setup();
  render(<Filters onSubmit={() => submitted++} />);
  assert.equal(
    screen.queryByRole("searchbox", { name: "Tìm phường/xã trong danh sách" }),
    null,
  );
  const trigger = screen.getByRole("button", { name: /^Phường\/xã/ });
  await user.click(trigger);
  const panel = await screen.findByRole("dialog", { name: "Phường/xã" });
  const search = within(panel).getByRole("searchbox", {
    name: "Tìm phường/xã trong danh sách",
  });
  await waitFor(() => assert.equal(document.activeElement, search));
  await user.type(search, "sai gon");
  assert.equal(
    within(panel).queryByRole("button", { name: "Phường Tân Định" }),
    null,
  );
  await user.click(
    within(panel).getByRole("button", { name: "Phường Sài Gòn" }),
  );
  assert.equal(screen.queryByRole("dialog", { name: "Phường/xã" }), null);
  assert.match(trigger.textContent ?? "", /Phường Sài Gòn/);
  assert.equal(submitted, 0);
  await user.click(trigger);
  const reopened = await screen.findByRole("dialog", { name: "Phường/xã" });
  assert.equal(
    (within(reopened).getByRole("searchbox") as HTMLInputElement).value,
    "",
  );
  assert.equal(
    within(reopened)
      .getByRole("button", { name: "Phường Sài Gòn" })
      .getAttribute("aria-pressed"),
    "true",
  );
  await user.type(within(reopened).getByRole("searchbox"), "not-a-location");
  assert.match(
    within(reopened).getByRole("status").textContent ?? "",
    /Không tìm thấy/,
  );
  await user.click(screen.getByRole("heading", { name: "Bộ lọc" }));
  await waitFor(() =>
    assert.equal(screen.queryByRole("dialog", { name: "Phường/xã" }), null),
  );
});
test("area also uses a custom dropdown with no native select controls", async () => {
  const user = userEvent.setup();
  render(<Filters />);
  assert.equal(document.querySelector("select"), null);
  const trigger = screen.getByRole("button", { name: /^Khu vực/ });
  await user.click(trigger);
  const panel = await screen.findByRole("dialog", { name: "Khu vực" });
  await user.click(within(panel).getByRole("button", { name: "KV13" }));
  assert.match(trigger.textContent ?? "", /KV13/);
  assert.equal(screen.queryByRole("dialog", { name: "Khu vực" }), null);
});
test("pickers remain disabled inside a disabled editor fieldset", async () => {
  const user = userEvent.setup();
  render(
    <fieldset disabled>
      <DepartmentChoices
        value={[]}
        onChange={() => assert.fail("Should not change")}
      />
      <LocationPicker
        value="all"
        onChange={() => assert.fail("Should not change")}
      />
    </fieldset>,
  );
  await user.click(screen.getByRole("button", { name: /^Ban ngành/ }));
  await user.click(screen.getByRole("button", { name: /^Phường\/xã/ }));
  assert.equal(screen.queryByRole("dialog"), null);
});
