import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { getMemberOptions, type MemberDetailInput } from "@org/core";
import { Button, Input, Dropdown } from "@org/ui";
import { ClientError } from "../locale";

export function FamilyEditor({
  org,
  memberId,
  value,
  onChange,
}: {
  org: string;
  memberId: string;
  value: MemberDetailInput["familyMembers"];
  onChange: (value: MemberDetailInput["familyMembers"]) => void;
}) {
  const options = useQuery({
    queryKey: ["organizations", org, "member-options"],
    queryFn: () => getMemberOptions(org),
    staleTime: 30_000,
  });
  if (options.isPending) return <p role="status">Đang tải thành viên…</p>;
  if (options.isError) return <ClientError error={options.error} />;
  return (
    <div className="space-y-3">
      {value.map((relative, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <label className="block text-sm">
            Người thân {index + 1}
            <Dropdown
              aria-label={`Người thân ${index + 1}`}
              value={relative.id}
              className="mt-2 min-h-12 w-full"
              onChange={(e) =>
                onChange(
                  value.map((r, i) =>
                    i === index ? { ...r, id: e.target.value } : r,
                  ),
                )
              }
            >
              {options.data
                .filter((m) => m.id !== memberId)
                .map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    disabled={value.some(
                      (r, i) => i !== index && r.id === m.id,
                    )}
                  >
                    {m.name}
                  </option>
                ))}
            </Dropdown>
          </label>
          <label className="block text-sm">
            Mối quan hệ
            <Input
              aria-label={`Mối quan hệ ${index + 1}`}
              placeholder="Nhập mối quan hệ, ví dụ: Vợ, Chồng, Con"
              className="profile-edit-input mt-2 min-h-12"
              value={relative.relationship}
              onChange={(e) =>
                onChange(
                  value.map((r, i) =>
                    i === index ? { ...r, relationship: e.target.value } : r,
                  ),
                )
              }
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            size="touch"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Trash2 size={16} />
            Xóa người thân
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="touch"
        className="w-full"
        disabled={
          value.length >= 30 ||
          !options.data.some(
            (m) => m.id !== memberId && !value.some((r) => r.id === m.id),
          )
        }
        onClick={() => {
          const next = options.data.find(
            (m) => m.id !== memberId && !value.some((r) => r.id === m.id),
          );
          if (next)
            onChange([...value, { id: next.id, relationship: "Người thân" }]);
        }}
      >
        <Plus size={16} />
        Thêm người thân
      </Button>
    </div>
  );
}
