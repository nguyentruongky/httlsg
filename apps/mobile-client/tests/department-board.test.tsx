import { after, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@org/ui";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const temp = await mkdtemp(
    fileURLToPath(new URL("../../../.local-data/board-ui-", import.meta.url)),
  ),
  output = join(temp, "board.mjs");
await build({
  entryPoints: [
    fileURLToPath(
      new URL(
        "../../web-admin/components/department-board.tsx",
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
});
const { BoardRoleEditor, BoardYears } = (await import(
  pathToFileURL(output).href
)) as typeof import("../../web-admin/components/department-board");
after(() => rm(temp, { recursive: true, force: true }));
const originalFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});
function mount(view: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <Toaster>{view}</Toaster>
    </QueryClientProvider>,
  );
}
const person = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Nguyễn An",
  position: "Ban viên",
};
test("role selection shows all five choices and saves to a year", async () => {
  const writes: any[] = [];
  let closed = false;
  globalThis.fetch = async (path, init) => {
    writes.push({
      path: String(path),
      method: init?.method,
      ...JSON.parse(String(init?.body)),
    });
    return new Response(JSON.stringify({ revision: 2 }));
  };
  mount(
    <BoardRoleEditor
      departmentId="thanh-nien"
      year={2026}
      revision={1}
      person={person}
      isBoardMember={false}
      onClose={() => {
        closed = true;
      }}
    />,
  );
  const user = userEvent.setup();
  assert.equal(screen.queryByRole("textbox", { name: "Chức vụ" }), null);
  assert.equal(screen.getAllByRole("radio").length, 5);
  assert.equal(screen.queryByRole("combobox"), null);
  assert.equal(screen.queryByRole("listbox"), null);
  await user.click(screen.getByRole("radio", { name: "Thư ký" }));
  assert.equal(
    (screen.getByRole("radio", { name: "Thư ký" }) as HTMLInputElement).checked,
    true,
  );
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => assert.equal(closed, true));
  assert.deepEqual(writes[0], {
    path: "/api/admin/departments/thanh-nien/board",
    method: "PATCH",
    year: 2026,
    revision: 1,
    id: person.id,
    position: "Thư ký",
  });
});
test("role conflicts preserve the selected role and annual removal uses null position", async () => {
  const writes: any[] = [];
  globalThis.fetch = async (_, init) => {
    const body = JSON.parse(String(init?.body));
    writes.push(body);
    return new Response(
      JSON.stringify({ message: "Ban điều hành đã thay đổi." }),
      { status: 409 },
    );
  };
  mount(
    <BoardRoleEditor
      departmentId="thanh-nien"
      year={2026}
      revision={2}
      person={{ ...person, position: "Trưởng ban" }}
      isBoardMember
      onClose={() => {}}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await screen.findByText("Ban điều hành đã thay đổi.");
  assert.equal(
    (screen.getByRole("radio", { name: "Trưởng ban" }) as HTMLInputElement)
      .checked,
    true,
  );
  await user.click(
    screen.getByRole("button", { name: "Gỡ khỏi Ban điều hành" }),
  );
  await waitFor(() => assert.equal(writes.length, 2));
  assert.equal(writes[1].position, null);
});
test("year browser shows one roster per year without revision sessions", async () => {
  let chosen = 0;
  const user = userEvent.setup();
  mount(
    <BoardYears
      year={2026}
      items={[
        {
          year: 2026,
          revision: 4,
          members: [{ ...person, position: "Thư ký" }],
        },
        {
          year: 2025,
          revision: 1,
          members: [
            { ...person, name: "Người năm trước", position: "Ủy viên" },
          ],
        },
      ]}
      onChoose={(year) => {
        chosen = year;
      }}
      onClose={() => {}}
    />,
  );
  assert.ok(screen.getByText("Nguyễn An"));
  assert.equal(screen.queryByText(/Phiên bản/), null);
  await user.click(screen.getByRole("button", { name: "2025" }));
  assert.ok(screen.getByText("Người năm trước"));
  assert.equal(screen.queryByText("Nguyễn An"), null);
  await user.click(screen.getByRole("button", { name: "Cập nhật năm 2025" }));
  assert.equal(chosen, 2025);
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Nhập năm Ban điều hành" }),
    { target: { value: "2027" } },
  );
  await user.click(screen.getByRole("button", { name: "Xem" }));
  assert.ok(screen.getByText("Chưa có Ban điều hành cho năm này."));
});
