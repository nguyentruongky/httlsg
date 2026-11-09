import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { randomUUID } from "node:crypto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@org/ui";
import {
  ScheduleDraft,
  defaultScheduleSettings,
  type ScheduleRecord,
  type ScheduleCategory,
} from "@org/core";
import { ScheduleViews } from "../src/schedules/schedule-views";
import { ScheduleEditor } from "../src/schedules/schedule-editor";
afterEach(cleanup);
function fixture() {
  const person = randomUUID();
  const draft = ScheduleDraft.parse({
    categoryId: "prayer_guidance",
    title: "Lịch cầu nguyện tháng 11",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    settings: defaultScheduleSettings("prayer_guidance"),
    events: [
      {
        id: randomUUID(),
        date: "2026-11-08",
        title: "Cầu nguyện sáng",
        startTime: "06:30",
        responsibilities: [
          {
            id: randomUUID(),
            name: "Người hướng dẫn",
            assignments: [{ memberId: person, notes: "Đến sớm" }],
          },
        ],
      },
    ],
  });
  return {
    ...draft,
    id: randomUUID(),
    status: "published",
    version: 1,
    createdBy: null,
    updatedBy: null,
    publishedAt: null,
    cancelledAt: null,
    memberNames: { [person]: "Nguyễn Văn An" },
    departmentNames: {},
  } as ScheduleRecord;
}
const category: ScheduleCategory = {
  id: "prayer_guidance",
  name: "Lịch hướng dẫn cầu nguyện",
  description: "",
  isActive: true,
  version: 1,
  settings: defaultScheduleSettings("prayer_guidance"),
  definitions: [
    {
      id: randomUUID(),
      name: "Người hướng dẫn",
      description: "",
      isActive: true,
      sortOrder: 0,
    },
  ],
  canManage: true,
};
function mount(node: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <Toaster>{node}</Toaster>
    </QueryClientProvider>,
  );
}
test("table preserves names and notes; readonly month opens detail; week navigation starts Sunday", async () => {
  mount(<ScheduleViews schedule={fixture()} />);
  assert.ok(screen.getAllByText(/Nguyễn Văn An/).length);
  fireEvent.click(screen.getByRole("button", { name: "Tháng" }));
  fireEvent.click(screen.getByRole("button", { name: /Cầu nguyện sáng/ }));
  assert.ok(await screen.findByRole("dialog"));
  assert.ok(screen.getAllByText("Người hướng dẫn").length);
  fireEvent.click(screen.getByRole("button", { name: "Đóng chi tiết lịch" }));
  await waitFor(() => assert.ok(screen.queryByRole("dialog") === null));
  fireEvent.click(screen.getByRole("button", { name: "Tuần" }));
  assert.ok(screen.getByText(/CN/));
});
test("new schedule editor supports configurable prayer day generation and warns before leaving unsaved work", async () => {
  const record = fixture();
  const {
    categoryId,
    title,
    description,
    periodStart,
    periodEnd,
    settings,
    events,
  } = record;
  const initial = ScheduleDraft.parse({
    categoryId,
    title,
    description,
    periodStart,
    periodEnd,
    settings,
    events,
  });
  initial.events = [];
  let left = false;
  mount(
    <ScheduleEditor
      initial={initial}
      category={category}
      departments={[]}
      onBack={() => {
        left = true;
      }}
      onSaved={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Tạo lịch từng ngày/ }));
  assert.ok(screen.getAllByText(/Chưa phân công/).length >= 30);
  fireEvent.click(screen.getByRole("button", { name: "Về danh sách lịch" }));
  assert.ok(await screen.findByRole("dialog"));
  assert.equal(left, false);
});
