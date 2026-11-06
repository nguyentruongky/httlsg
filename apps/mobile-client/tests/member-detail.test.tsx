import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  demo,
  getDirectoryMember,
  getMyProfile,
  orgs,
  type DirectoryMember,
} from "@org/core";
import { MemberDetail } from "../src/member-detail";
import { statusLabels } from "../src/locale";
afterEach(cleanup);
const sourceFixture: NonNullable<DirectoryMember["source"]> = {
  row: 2,
  preferredName: "Tên gọi kiểm thử",
  gender: "Nữ",
  faithDate: "",
  baptismDate: "",
  age: "",
  believerType: "Tín hữu",
  areaRaw: "Khu vực 01",
  familyRole: "Con",
  lastVisitDate: "",
  departmentRaw: "",
  phoneRaw: "0900000001",
  householdName: "Hộ kiểm thử",
  addressRaw: "Địa chỉ kiểm thử",
  ambiguousHousehold: false,
};
async function showDetails(
  patch: Partial<DirectoryMember> = {},
  readonly = false,
  navigation: { returnHref?: string; onBack?: () => void } = {},
) {
  const org = orgs[0].id;
  const member = {
    ...(await getDirectoryMember(org, "20000000-0000-4000-8000-000000000101")),
    ...patch,
  };
  if (patch.source) {
    member.faithDate = (patch.faithDate ?? patch.source.faithDate) || null;
    member.baptismDate =
      (patch.baptismDate ?? patch.source.baptismDate) || null;
    member.lastVisitDate =
      (patch.lastVisitDate ?? patch.source.lastVisitDate) || null;
    member.preferredName = patch.source.preferredName;
    member.gender = patch.source.gender;
    member.householdRole = patch.source.familyRole;
  }
  const actor = await getMyProfile(org);
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  client.setQueryData(["organizations", org, "member", member.id], member);
  client.setQueryData(
    ["organizations", org, "my-profile"],
    readonly ? { ...actor, role: "member" } : actor,
  );
  render(
    <QueryClientProvider client={client}>
      <MemberDetail org={org} memberId={member.id} {...navigation} />
    </QueryClientProvider>,
  );
  return member;
}
test("compact member header has inline department/status and no global edit action", async () => {
  const m = await showDetails();
  assert.ok(screen.getByRole("heading", { name: m.user.name }));
  const header = screen.getByRole("group", { name: "Thông tin chính" });
  assert.ok(header);
  const content = within(header);
  assert.ok(content.getByText(statusLabels[m.status]));
  assert.match(header.textContent ?? "", new RegExp(m.departments[0].name));
  assert.equal(content.queryByText("Thành viên"), null);
  assert.equal(content.queryByText("Chỉnh sửa thông tin"), null);
  assert.equal(content.queryByText("Gọi điện"), null);
  assert.equal(content.queryByText("Gửi thư"), null);
  assert.equal(
    screen.queryByRole("button", { name: "Chỉnh sửa thông tin" }),
    null,
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Sửa Họ và tên" }));
  assert.ok(screen.getByRole("heading", { name: m.user.name }));
  assert.ok(screen.getByRole("form", { name: "Chỉnh sửa Họ và tên" }));
  assert.equal(
    screen.queryByRole("form", { name: "Chỉnh sửa hồ sơ thành viên" }),
    null,
  );
});
test("phone has an aligned call action, email is plain text, and unavailable dates are hidden", async () => {
  const m = await showDetails(
    {
      dateOfBirth: null,
      phone: "+84 900 000 001",
      address: "12 Nguyễn Huệ, Phường Sài Gòn",
      membershipDateKnown: false,
      source: sourceFixture,
    },
    true,
  );
  assert.ok(screen.getByText(m.phone!));
  assert.equal(screen.queryByRole("link", { name: m.phone! }), null);
  assert.ok(screen.getByText(m.user.email!));
  assert.equal(screen.queryByRole("link", { name: m.user.email! }), null);
  const call = screen.getByRole("link", { name: "Gọi điện" });
  assert.equal(call.getAttribute("href"), "tel:+84900000001");
  assert.equal(
    call.parentElement,
    screen.getByText("Số điện thoại").closest("dt"),
  );
  const directions = screen.getByRole("link", { name: "Chỉ đường" });
  const directionsUrl = new URL(directions.getAttribute("href")!);
  assert.equal(directionsUrl.origin, "https://www.google.com");
  assert.equal(directionsUrl.pathname, "/maps/dir/");
  assert.equal(directionsUrl.searchParams.get("destination"), m.address);
  assert.equal(
    directions.parentElement,
    screen.getByText("Địa chỉ").closest("dt"),
  );
  assert.equal(document.querySelectorAll('a[href^="tel:"]').length, 1);
  assert.equal(document.querySelectorAll('a[href^="mailto:"]').length, 0);
  for (const label of ["Ngày sinh", "Ngày tham gia", "Thăm viếng gần nhất"])
    assert.equal(screen.queryByText(label), null);
  const membership = screen.getByRole("heading", {
    name: "Thông tin trong Hội Thánh",
  }).parentElement!;
  assert.ok(within(membership).getByText("Ngày báp-têm"));
  assert.ok(within(membership).getByText("Ngày tin Chúa"));
  assert.equal(within(membership).getAllByText("Chưa cập nhật").length, 3);
  assert.equal(screen.queryByText("Loại tín hữu"), null);
  assert.equal(screen.queryByText("Khu vực gốc"), null);
  assert.equal(screen.queryByText("Số điện thoại gốc"), null);
  assert.ok(screen.getByText("Phường/xã"));
  assert.equal(screen.queryByText("Địa phương"), null);
});
test("known dates remain visible and edit permissions still apply", async () => {
  await showDetails(
    { source: { ...sourceFixture, baptismDate: "2000-01-02" } },
    true,
  );
  assert.ok(screen.getByText("Ngày sinh"));
  assert.ok(screen.getByText("Ngày tham gia"));
  const membership = screen.getByRole("heading", {
    name: "Thông tin trong Hội Thánh",
  }).parentElement!;
  assert.ok(within(membership).getByText("Ngày báp-têm"));
  const source = screen.getByRole("heading", {
    name: "Thông tin bổ sung",
  }).parentElement!;
  assert.equal(within(source).queryByText("Ngày báp-têm"), null);
  assert.equal(screen.queryByText("Vai trò trong tổ chức"), null);
  assert.equal(
    screen.queryByRole("button", { name: "Chỉnh sửa thông tin" }),
    null,
  );
});

test("inline fields save and cancel on the detail page with validation and contact links intact", async () => {
  const m = await showDetails();
  const user = userEvent.setup();
  assert.equal(document.querySelector("button a"), null);
  const phoneField = screen.getByRole("button", { name: "Sửa Số điện thoại" });
  assert.equal(phoneField.textContent, m.phone);
  await user.click(phoneField);
  const phoneForm = screen.getByRole("form", {
    name: "Chỉnh sửa Số điện thoại",
  });
  assert.equal(
    within(phoneForm).getByRole<HTMLInputElement>("textbox", {
      name: "Số điện thoại",
    }).value,
    m.phone,
  );
  assert.ok(screen.getByRole("link", { name: "Gọi điện" }));
  await user.click(within(phoneForm).getByRole("button", { name: "Hủy" }));
  await user.click(screen.getByRole("button", { name: "Sửa Nghề nghiệp" }));
  let form = screen.getByRole("form", { name: "Chỉnh sửa Nghề nghiệp" });
  const input = within(form).getByRole("textbox", { name: "Nghề nghiệp" });
  await user.clear(input);
  await user.type(input, "Nghề mới kiểm thử");
  await user.click(within(form).getByRole("button", { name: "Hủy" }));
  assert.equal(screen.queryByText("Nghề mới kiểm thử"), null);
  await user.click(screen.getByRole("button", { name: "Sửa Email" }));
  form = screen.getByRole("form", { name: "Chỉnh sửa Email" });
  const email = within(form).getByRole("textbox", { name: "Email" });
  await user.clear(email);
  await user.type(email, "invalid-email");
  await user.click(within(form).getByRole("button", { name: "Lưu" }));
  assert.match(
    (await within(form).findByRole("alert")).textContent ?? "",
    /không hợp lệ/,
  );
  await user.click(within(form).getByRole("button", { name: "Hủy" }));
  await user.click(screen.getByRole("button", { name: "Sửa Nghề nghiệp" }));
  form = screen.getByRole("form", { name: "Chỉnh sửa Nghề nghiệp" });
  await user.clear(within(form).getByRole("textbox"));
  await user.type(within(form).getByRole("textbox"), "Giáo viên kiểm thử");
  await user.click(within(form).getByRole("button", { name: "Lưu" }));
  await screen.findByText("Đã lưu thay đổi.");
  assert.equal(
    (await getDirectoryMember(orgs[0].id, m.id)).occupation,
    "Giáo viên kiểm thử",
  );
  assert.ok(screen.getByRole("heading", { name: m.user.name }));
});
test("department roles and membership dates save independently in the same detail screen", async () => {
  const m = await showDetails();
  const user = userEvent.setup();
  const department = m.departments[0];
  await user.click(
    screen.getByRole("button", {
      name: `Sửa Vai trò trong ${department.name}`,
    }),
  );
  let form = screen.getByRole("form", {
    name: `Chỉnh sửa Vai trò trong ${department.name}`,
  });
  await user.clear(within(form).getByRole("textbox"));
  await user.type(within(form).getByRole("textbox"), "Thư ký");
  await user.click(within(form).getByRole("button", { name: "Lưu" }));
  await screen.findByText("Đã lưu thay đổi.");
  let saved = await getDirectoryMember(orgs[0].id, m.id);
  assert.equal(saved.departments[0].position, "Thư ký");
  assert.equal(saved.role, m.role);
  await user.click(screen.getByRole("button", { name: "Sửa Ngày báp-têm" }));
  form = screen.getByRole("form", { name: "Chỉnh sửa Ngày báp-têm" });
  const baptism = within(form).getByPlaceholderText("ngày/tháng/năm");
  await user.clear(baptism);
  await user.type(baptism, "31/02/2001");
  await user.click(within(form).getByRole("button", { name: "Lưu" }));
  assert.ok(await within(form).findByRole("alert"));
  await user.clear(baptism);
  await user.type(baptism, "10/06/2001");
  await user.click(within(form).getByRole("button", { name: "Lưu" }));
  await screen.findByText("Đã lưu thay đổi.");
  saved = await getDirectoryMember(orgs[0].id, m.id);
  assert.equal(saved.baptismDate, "2001-06-10");
  assert.ok(screen.getByText("10/06/2001"));
  assert.equal(saved.departments[0].position, "Thư ký");
});
test("read-only viewers have no inline editors", async () => {
  await showDetails({}, true);
  assert.equal(screen.queryByRole("button", { name: /^Sửa / }), null);
  assert.equal(screen.queryByRole("textbox"), null);
});

test("family and departments update through section actions, with compact role values", async () => {
  const m = await showDetails({
    departments: [
      {
        ...(
          await getDirectoryMember(
            orgs[0].id,
            "20000000-0000-4000-8000-000000000101",
          )
        ).departments[0],
        position: "",
      },
    ],
  });
  const user = userEvent.setup();
  assert.equal(screen.queryByText("Liên kết người thân"), null);
  assert.equal(screen.queryByText("Tên gia đình"), null);
  assert.equal(
    screen.queryByRole("button", { name: "Sửa Tên gia đình" }),
    null,
  );
  const departmentSection = screen.getByRole("heading", { name: "Ban ngành" })
    .parentElement!.parentElement!;
  assert.ok(
    within(departmentSection).getByRole("button", {
      name: `Sửa Vai trò trong ${m.departments[0].name}`,
    }),
  );
  assert.match(
    within(departmentSection).getByRole("button", {
      name: `Sửa Vai trò trong ${m.departments[0].name}`,
    }).textContent ?? "",
    /Ban viên/,
  );
  await user.click(screen.getByRole("button", { name: "Cập nhật Gia đình" }));
  let form = screen.getByRole("form", { name: "Chỉnh sửa Gia đình" });
  await within(form).findByRole("button", { name: "Thêm người thân" });
  const removals = within(form).getAllByRole("button", {
    name: "Xóa người thân",
  });
  await user.click(removals[0]);
  await user.click(within(form).getByRole("button", { name: "Lưu" }));
  await screen.findByText("Đã lưu thay đổi.");
  assert.equal(
    (await getDirectoryMember(orgs[0].id, m.id)).family?.members.length,
    m.family!.members.length - 1,
  );
  await user.click(screen.getByRole("button", { name: "Cập nhật Ban ngành" }));
  form = screen.getByRole("form", { name: "Chỉnh sửa Ban ngành" });
  assert.ok(within(form).getByRole("button", { name: /^Ban ngành/ }));
  await user.click(within(form).getByRole("button", { name: "Hủy" }));
});
test("notes stack newest first and visits save within church information", async () => {
  const m = await showDetails();
  const user = userEvent.setup();
  const history = screen.getByRole("heading", {
    name: "Thông tin trong Hội Thánh",
  }).parentElement!;
  assert.ok(
    within(history).getByRole("heading", { name: "Lịch sử thăm viếng" }),
  );
  for (const text of [
    "Nội dung ghi chú đầu tiên",
    "Nội dung ghi chú mới nhất",
  ]) {
    await user.click(screen.getByRole("button", { name: "Thêm ghi chú" }));
    const form = screen.getByRole("form", { name: "Thêm ghi chú" });
    await user.type(
      within(form).getByRole("textbox", { name: "Nội dung ghi chú" }),
      text,
    );
    await user.click(within(form).getByRole("button", { name: "Lưu" }));
    await screen.findByRole("button", { name: "Thêm ghi chú" });
  }
  const notes = screen.getByRole("list", { name: "Danh sách ghi chú" });
  const items = within(notes).getAllByRole("listitem");
  assert.match(items[0].textContent ?? "", /mới nhất/);
  assert.match(items[1].textContent ?? "", /đầu tiên/);
  await user.click(screen.getByRole("button", { name: "Thêm lần thăm viếng" }));
  const form = screen.getByRole("form", { name: "Thêm lần thăm viếng" });
  const { fireEvent } = await import("@testing-library/react");
  fireEvent.change(within(form).getByLabelText("Ngày thăm viếng"), {
    target: { value: "03/02/2025" },
  });
  assert.equal(
    within(form).queryByRole("textbox", { name: "Nội dung thăm viếng" }),
    null,
  );
  await user.click(within(form).getByRole("button", { name: "Lưu" }));
  await screen.findByRole("button", { name: "Thêm lần thăm viếng" });
  const visits = screen.getByRole("list", { name: "Các lần thăm viếng" });
  const visit = within(visits).getAllByRole("listitem")[0];
  assert.ok(within(visit).getByText("03/02/2025"));
  assert.ok(
    within(visit).getByText((await getMyProfile(orgs[0].id)).user.name),
  );
  assert.equal(
    (await getDirectoryMember(orgs[0].id, m.id)).visitHistory[0].visitedOn,
    "2025-02-03",
  );
  assert.equal(
    (await getDirectoryMember(orgs[0].id, m.id)).visitHistory[0].summary,
    "",
  );
});

test("church status saves inline independently of account access", async () => {
  const m = await showDetails();
  const user = userEvent.setup();
  const section = screen.getByRole("heading", {
    name: "Thông tin trong Hội Thánh",
  }).parentElement!;
  await user.click(
    within(section).getByRole("button", { name: "Sửa Tình trạng" }),
  );
  const form = within(section).getByRole("form", {
    name: "Chỉnh sửa Tình trạng",
  });
  for (const name of [
    "Trung tín",
    "Không trung tín",
    "Không đi nhóm",
    "Chuyển hội",
    "Đi nước ngoài",
  ])
    assert.ok(within(form).getByRole("radio", { name }));
  await user.click(within(form).getByRole("radio", { name: "Chuyển hội" }));
  await user.click(within(form).getByRole("button", { name: "Lưu" }));
  await screen.findByText("Đã lưu thay đổi.");
  const saved = await getDirectoryMember(orgs[0].id, m.id);
  assert.equal(saved.churchStatus, "Chuyển hội");
  assert.equal(saved.status, m.status);
  assert.equal(saved.role, m.role);
  assert.ok(within(section).getByRole("button", { name: "Sửa Tình trạng" }));
});

test("visits without an author show only their date", async () => {
  await showDetails(
    {
      visitHistory: [
        {
          id: "20000000-0000-4000-8000-000000000101",
          organizationId: orgs[0].id,
          memberId: "20000000-0000-4000-8000-000000000101",
          authorId: null,
          authorName: "",
          visitedOn: "2025-01-02",
          summary: "Old summary",
          createdAt: "2025-01-02T00:00:00.000Z",
          source: "legacy",
        },
      ],
    },
    true,
  );
  const list = screen.getByRole("list", { name: "Các lần thăm viếng" });
  assert.equal(within(list).getByRole("listitem").textContent, "02/01/2025");
});

test("embedded profile back uses its supplied department destination and callback", async () => {
  let returned = 0;
  const target = "/dashboard/settings/departments/thanh-nien";
  await showDetails({}, false, {
    returnHref: target,
    onBack: () => returned++,
  });
  const link = screen.getByRole("link", { name: "Về danh sách thành viên" });
  assert.equal(link.getAttribute("href"), target);
  const user = userEvent.setup();
  await user.click(link);
  assert.equal(returned, 1);
});
