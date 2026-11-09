"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, createRequestId, type ScheduleCategory } from "@org/core";
import { Button, Dialog, Input, Select, Checkbox, ErrorMessage } from "@org/ui";
export function CategorySettings({
  category,
  canActivate,
  onClose,
}: {
  category: ScheduleCategory;
  canActivate: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState(category.settings),
    [definitions, setDefinitions] = useState(category.definitions),
    [active, setActive] = useState(category.isActive);
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      apiRequest("/api/schedule-categories", {
        method: "PATCH",
        body: JSON.stringify({
          categoryId: category.id,
          version: category.version,
          settings: {
            ...settings,
            sessions: settings.sessions
              .map((value) => value.trim())
              .filter(Boolean),
          },
          ...(canActivate ? { isActive: active } : {}),
          definitions: definitions.map((item, index) => ({
            ...item,
            sortOrder: index,
          })),
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["schedule-categories"] });
      onClose();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      title="Cấu hình trách nhiệm"
      description={category.name}
      closeLabel="Đóng cấu hình trách nhiệm"
      fullScreenOnMobile
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <fieldset className="space-y-4" disabled={save.isPending}>
          {canActivate && (
            <label className="flex min-h-11 items-center gap-3">
              <Checkbox
                checked={active}
                onCheckedChange={(value) => setActive(Boolean(value))}
              />
              Loại lịch đang hoạt động
            </label>
          )}
          <label className="block text-sm">
            Kiểu bảng
            <Select
              className="mt-2 w-full"
              value={settings.layout}
              onChange={(event) =>
                setSettings((old) => ({
                  ...old,
                  layout: event.target.value as typeof settings.layout,
                }))
              }
            >
              <option value="table">Bảng trách nhiệm</option>
              <option value="weekday">Theo tháng và thứ</option>
              <option value="sessions">Theo buổi chương trình</option>
            </Select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Giờ mặc định thứ hai–thứ bảy
              <Input
                type="time"
                className="mt-2 w-full"
                value={settings.weekdayTime ?? ""}
                onChange={(event) =>
                  setSettings((old) => ({
                    ...old,
                    weekdayTime: event.target.value || null,
                  }))
                }
              />
            </label>
            <label className="text-sm">
              Giờ mặc định Chúa nhật
              <Input
                type="time"
                className="mt-2 w-full"
                value={settings.sundayTime ?? ""}
                onChange={(event) =>
                  setSettings((old) => ({
                    ...old,
                    sundayTime: event.target.value || null,
                  }))
                }
              />
            </label>
          </div>
          <label className="block text-sm">
            Các buổi gợi ý, mỗi dòng một buổi
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3"
              value={settings.sessions.join("\n")}
              onChange={(event) =>
                setSettings((old) => ({
                  ...old,
                  sessions: event.target.value.split("\n"),
                }))
              }
            />
          </label>
          <h2 className="font-semibold">Trách nhiệm gợi ý</h2>
          {definitions.map((item, index) => (
            <div className="space-y-2 rounded-lg border p-3" key={item.id}>
              <label className="block text-sm">
                Tên trách nhiệm
                <Input
                  required
                  maxLength={100}
                  className="mt-2 w-full"
                  value={item.name}
                  onChange={(event) =>
                    setDefinitions((old) =>
                      old.map((value) =>
                        value.id === item.id
                          ? { ...value, name: event.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                Mô tả
                <Input
                  maxLength={500}
                  className="mt-2 w-full"
                  value={item.description}
                  onChange={(event) =>
                    setDefinitions((old) =>
                      old.map((value) =>
                        value.id === item.id
                          ? { ...value, description: event.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <Checkbox
                  checked={item.isActive}
                  onCheckedChange={(checked) =>
                    setDefinitions((old) =>
                      old.map((value) =>
                        value.id === item.id
                          ? { ...value, isActive: Boolean(checked) }
                          : value,
                      ),
                    )
                  }
                />
                Đang sử dụng
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!index}
                  onClick={() =>
                    setDefinitions((old) => {
                      const list = [...old];
                      [list[index - 1], list[index]] = [
                        list[index],
                        list[index - 1],
                      ];
                      return list;
                    })
                  }
                >
                  Lên
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === definitions.length - 1}
                  onClick={() =>
                    setDefinitions((old) => {
                      const list = [...old];
                      [list[index + 1], list[index]] = [
                        list[index],
                        list[index + 1],
                      ];
                      return list;
                    })
                  }
                >
                  Xuống
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setDefinitions((old) =>
                      old.filter((value) => value.id !== item.id),
                    )
                  }
                >
                  Gỡ mẫu
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={definitions.length >= 30}
            onClick={() =>
              setDefinitions((old) => [
                ...old,
                {
                  id: createRequestId(),
                  name: "",
                  description: "",
                  isActive: true,
                  sortOrder: old.length,
                },
              ])
            }
          >
            Thêm mẫu trách nhiệm
          </Button>
        </fieldset>
        {save.error && <ErrorMessage error={save.error} />}
        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending}>
            Lưu cấu hình
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={onClose}
          >
            Hủy
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
