import { after, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AuthSessionProvider,
  getDirectoryMember,
  orgs,
  departments,
  type AdminOtpPage,
} from "@org/core";
import { Toaster } from "@org/ui";
import { ClientAuthGate } from "../src/login-form";
import { build } from "esbuild";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// Bundle the Next components as ESM so this Vite test shares one React Query context.
const cache = fileURLToPath(new URL("../../../.local-data/", import.meta.url));
await mkdir(cache, { recursive: true });
const temp = await mkdtemp(join(cache, "merge-ui-"));
const output = join(temp, "member-table.mjs");
await build({
  entryPoints: [
    fileURLToPath(
      new URL("../../web-admin/components/member-table.tsx", import.meta.url),
    ),
  ],
  outfile: output,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "automatic",
});
const { MemberTable } = (await import(
  pathToFileURL(output).href
)) as typeof import("../../web-admin/components/member-table");
const otpOutput = join(temp, "admin-otp-console.mjs");
await build({
  entryPoints: [
    fileURLToPath(
      new URL(
        "../../web-admin/components/admin-otp-console.tsx",
        import.meta.url,
      ),
    ),
  ],
  outfile: otpOutput,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "automatic",
});
const { AdminOtpConsole } = (await import(
  pathToFileURL(otpOutput).href
)) as typeof import("../../web-admin/components/admin-otp-console");
after(async () => {
  await rm(temp, { recursive: true, force: true });
});
const first = await getDirectoryMember(
  orgs[0].id,
  "20000000-0000-4000-8000-000000000101",
);
const second = await getDirectoryMember(
  orgs[0].id,
  "20000000-0000-4000-8000-000000000102",
);
const original = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = original;
});
const json = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
function setup(role = "admin", view?: React.ReactNode) {
  const previews: string[][] = [],
    merges: any[] = [],
    assignments: any[] = [],
    otpRequests: Record<string, string>[] = [];
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    if (path === "/api/auth/me")
      return json({
        user: {
          id: "20000000-0000-4000-8000-000000000001",
          name: "Quản trị",
          role,
          roles: [role],
          permissions: [
            "members.write.all",
            "access.manage",
            "leader.otps.read",
          ],
          requiresPasswordSetup: false,
          authVersion: 1,
        },
      });
    if (path === "/api/catalog") return json({ departments });
    if (path.startsWith("/api/admin/members/search?memberId="))
      return json({
        items: [
          {
            id: first.id,
            name: first.user.name,
            role: "board",
            hasAccount: true,
            departmentId: "thanh-nien",
            allDepartments: ["Ban Thanh niên"],
            roles: [
              { roleId: "board", departmentId: "thanh-nien" },
              { roleId: "leader", departmentId: "thieu-nien" },
            ],
          },
        ],
      });
    if (path === "/api/admin/roles/assigned")
      return json({
        items: [],
        departments: [
          { id: "thanh-nien", name: "Ban Thanh niên" },
          { id: "thieu-nien", name: "Ban Thiếu niên" },
        ],
      });
    if (path === "/api/admin/roles/assign-user") {
      assignments.push(JSON.parse(String(init?.body)));
      return json({ ok: true });
    }
    if (path.startsWith("/api/admin/otps?")) {
      const params = Object.fromEntries(
        new URL(path, "http://localhost").searchParams,
      );
      otpRequests.push(params);
      const rows: AdminOtpPage["items"] = [
        {
          id: "phone",
          user_id: first.id,
          full_name: "OTP điện thoại",
          email: null,
          phone: "0900000000",
          department_name: "Ban Thanh niên",
          type: "PHONE_LEADER",
          status: "pending",
          otp_code: "654321",
          code_state: "available",
          created_at: "2026-01-01T00:00:00Z",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
        {
          id: "email",
          user_id: second.id,
          full_name: "OTP email",
          email: "otp@example.test",
          phone: null,
          department_name: null,
          type: "EMAIL",
          status: "pending",
          otp_code: null,
          code_state: "email",
          created_at: "2026-01-01T00:00:00Z",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
        {
          id: "closed",
          user_id: first.id,
          full_name: "OTP cũ",
          email: null,
          phone: "0900000000",
          department_name: "Ban Truyền thông",
          type: "PHONE_LEADER",
          status: "closed",
          otp_code: null,
          code_state: "unavailable",
          created_at: "2026-01-01T00:00:00Z",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      ];
      const items = rows.filter(
        (item) =>
          (params.type === "all" || params.type === item.type) &&
          (params.status === "all" || params.status === item.status),
      );
      return json({ items, total: items.length, page: 1, pageSize: 20 });
    }
    const payload = JSON.parse(String(init?.body));
    if (path === "/api/admin/members/merge/preview") {
      previews.push(payload.ids);
      return json({
        ids: payload.ids,
        previewToken: "a".repeat(64),
        profiles: [],
        roles: ["User"],
        retainedAccount: null,
        conflicts: ["Địa chỉ"],
        requiresLogin: false,
        counts: { departments: 2, households: 1, notes: 1, visits: 1 },
      });
    }
    if (path === "/api/admin/members/merge") {
      merges.push(payload);
      return json({ id: payload.ids[0], requiresLogin: false });
    }
    throw new Error(`Unexpected request ${path}`);
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <AuthSessionProvider>
        <ClientAuthGate>
          <Toaster>
            {view ?? <MemberTable org={orgs[0].id} members={[first, second]} />}
          </Toaster>
        </ClientAuthGate>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
  return { previews, merges, otpRequests, assignments };
}
test("member menu opens Phân công via one Phân quyền action and preserves all current scoped roles", async () => {
  const { assignments } = setup();
  const interaction = userEvent.setup();
  await interaction.click(
    await screen.findByRole("button", {
      name: `Actions for ${first.user.name}`,
    }),
  );
  const action = await screen.findByRole("menuitem", { name: "Phân quyền" });
  assert.equal(screen.queryByRole("menuitem", { name: /^Vai trò:/ }), null);
  await interaction.click(action);
  await screen.findByRole("dialog", { name: "Phân công" });
  await screen.findByRole("button", { name: "Ban điều hành" });
  await screen.findByRole("button", { name: "Trưởng Ban ngành" });
  await interaction.click(
    screen.getByRole("button", { name: "Lưu phân công" }),
  );
  await waitFor(() => assert.equal(assignments.length, 1));
  assert.deepEqual(assignments[0], {
    user_id: first.id,
    roles: [
      { role_id: "board", department_id: "thanh-nien" },
      { role_id: "leader", department_id: "thieu-nien" },
    ],
  });
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
});
test("Admin merge retains selection order, allows choosing the first ID, and requires review confirmation", async () => {
  const { previews, merges } = setup(),
    interaction = userEvent.setup();
  await interaction.click(
    await screen.findByRole("checkbox", { name: `Select ${second.user.name}` }),
  );
  await interaction.click(
    screen.getByRole("checkbox", { name: `Select ${first.user.name}` }),
  );
  await interaction.click(
    screen.getByRole("button", { name: "Hợp nhất 2 hồ sơ" }),
  );
  await screen.findByText(/Thông tin khác nhau/);
  assert.deepEqual(previews[0], [second.id, first.id]);
  const confirm = screen.getByRole("button", { name: "Xác nhận hợp nhất" });
  assert.equal((confirm as HTMLButtonElement).disabled, true);
  await interaction.click(screen.getByRole("button", { name: "Giữ ID này" }));
  await waitFor(() => assert.deepEqual(previews.at(-1), [first.id, second.id]));
  await interaction.click(
    screen.getByRole("checkbox", { name: "Xác nhận thông tin hợp nhất" }),
  );
  await waitFor(() =>
    assert.equal((confirm as HTMLButtonElement).disabled, false),
  );
  await interaction.click(confirm);
  await screen.findByText("Đã hợp nhất hồ sơ");
  assert.deepEqual(merges[0], {
    ids: [first.id, second.id],
    previewToken: "a".repeat(64),
  });
  assert.equal(screen.queryByRole("dialog"), null);
});
test("Thư ký has no merge action even when multiple profiles are selected", async () => {
  setup("secretary");
  const interaction = userEvent.setup();
  await interaction.click(
    await screen.findByRole("checkbox", { name: `Select ${first.user.name}` }),
  );
  await interaction.click(
    screen.getByRole("checkbox", { name: `Select ${second.user.name}` }),
  );
  assert.equal(screen.queryByRole("button", { name: /Hợp nhất/ }), null);
});

test("Admin OTP view shows both channels and historical requests, with working channel filters", async () => {
  const { otpRequests } = setup("admin", <AdminOtpConsole />);
  await screen.findByText("654321");
  assert.ok(screen.getByText("OTP email"));
  assert.equal(screen.queryByText("OTP cũ"), null);
  assert.ok(screen.getByText("Đã gửi qua email"));

  assert.equal(otpRequests[0].status, "pending");
  assert.equal(otpRequests[0].type, "all");
  assert.equal(
    screen.queryByRole("combobox", { name: "Lọc trạng thái OTP" }),
    null,
  );
});
test("non-Admin accounts cannot load the all-OTP screen or request its data", async () => {
  for (const role of ["secretary", "board", "leader", "user"]) {
    const { otpRequests } = setup(role, <AdminOtpConsole />);
    await screen.findByText("Chỉ Admin có quyền xem mã OTP.");
    assert.equal(otpRequests.length, 0);
    cleanup();
  }
});
