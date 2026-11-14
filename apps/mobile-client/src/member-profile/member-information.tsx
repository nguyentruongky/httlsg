import { PersonCard } from "../person-card";
import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Briefcase,
  Users,
  Building2,
  UserRound,
} from "lucide-react";
import {
  getAge,
  MemberDetailInputSchema,
  ChurchStatusSchema,
  useAuth,
  type DirectoryMember,
  type MemberDetailInput,
} from "@org/core";
import { Avatar, Button, Card, EmptyState, Input, Dropdown } from "@org/ui";
import { valuesFor } from "../member-detail-values";
import { formatDate } from "../date-input";
import {
  DepartmentChoices,
  AreaPicker,
  LocationPicker,
} from "../directory-fields";
import { MemberNotes, VisitHistory } from "../member-history";
import { InlineMemberField } from "../inline-member-field";
import { statusLabels } from "../locale";
import { FamilyEditor } from "./family-editor";

function displayDate(value: string | null | undefined) {
  return formatDate(value);
}
function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: ElementType;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3.5">
      <Icon size={17} className="mt-1 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-1 wrap-break-word text-sm">{children}</dd>
      </div>
    </div>
  );
}
export function MemberInformation({
  org,
  member: m,
  profile,
  editable,
  onPersist,
  onUpdated,
  backHref,
  onBack,
  hideBackButton,
  onOpenMember,
  memberHref,
}: {
  org: string;
  member: DirectoryMember;
  profile: boolean;
  backHref: string;
  onBack?: () => void;
  hideBackButton?: boolean;
  onOpenMember?: (id: string) => void;
  memberHref?: (id: string) => string;
  editable: boolean;
  onPersist: (values: MemberDetailInput, version: number) => Promise<void>;
  onUpdated: () => Promise<void>;
}) {
  const readOnlyAdministration = useAuth()?.user?.role === "deacon";
  const heading = useRef<HTMLHeadingElement>(null);
  const [active, setActive] = useState<{
      key: string;
      version: number;
      values: MemberDetailInput;
    } | null>(null),
    [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: ({
      values,
      version,
    }: {
      values: MemberDetailInput;
      version: number;
    }) => onPersist(values, version),
    onSuccess: () => {
      setActive(null);
      setSaved(true);
    },
  });
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [m.id]);
  const values = valuesFor(m);
  function sectionUpdate(
    key: "familyMembers" | "departmentIds",
    label: string,
  ) {
    if (!editable || m.canManageLinks === false) return null;
    return (
      <button
        type="button"
        aria-label={`Cập nhật ${label}`}
        disabled={mutation.isPending}
        onClick={() => {
          setSaved(false);
          setActive({ key, version: m.version, values: valuesFor(m) });
        }}
        className="ml-auto inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45"
      >
        Cập nhật
      </button>
    );
  }
  function field<T>(
    key: string,
    label: string,
    icon: ElementType,
    value: T,
    display: ReactNode,
    patch: (next: T) => Partial<MemberDetailInput>,
    type = "text",
    editor?: (draft: T, onChange: (draft: T) => void) => ReactNode,
    presentation?: {
      hideLabel?: boolean;
      actionLabel?: string;
      subdetail?: boolean;
      labelAction?: ReactNode;
      readOnly?: boolean;
    },
  ) {
    const { readOnly, ...displayProps } = presentation ?? {};
    const canEditField = editable && !readOnly;
    return (
      <InlineMemberField
        key={key}
        {...displayProps}
        label={label}
        icon={icon}
        value={value}
        display={display}
        editable={canEditField}
        editing={canEditField && active?.key === key}
        disabled={mutation.isPending}
        onStart={() => {
          setSaved(false);
          setActive({ key, version: m.version, values: valuesFor(m) });
        }}
        onCancel={() => setActive(null)}
        type={type}
        editor={editor}
        onSave={async (next) => {
          if (!active || active.key !== key)
            throw new Error("Vui lòng chọn lại trường cần sửa.");
          const result = MemberDetailInputSchema.safeParse({
            ...active.values,
            ...patch(next),
          });
          if (!result.success)
            throw new Error(
              result.error.issues[0]?.message ?? "Thông tin không hợp lệ.",
            );
          await mutation.mutateAsync({
            values: result.data,
            version: active.version,
          });
        }}
      />
    );
  }
  const blank = "Chưa cập nhật";
  return (
    <div className="space-y-5">
      {!profile && !hideBackButton && (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-11 rounded-full"
        >
          <a
            href={backHref}
            data-navigation="back"
            onClick={(event) => {
              if (onBack) {
                event.preventDefault();
                onBack();
              }
            }}
            aria-label={
              backHref === "/client/profile"
                ? "Quay lại hồ sơ cá nhân"
                : "Về danh sách thành viên"
            }
          >
            <ArrowLeft size={20} />
          </a>
        </Button>
      )}
      {saved && (
        <p
          role="status"
          className="rounded-lg bg-accent p-3 text-sm text-primary"
        >
          Đã lưu thay đổi.
        </p>
      )}
      <Card role="group" aria-label="Thông tin chính" className="p-5">
        <div className="flex items-start gap-4">
          <Avatar
            name={m.user.name}
            className="size-16 rounded-full bg-primary text-xl text-primary-foreground"
          />
          <div className="min-w-0 flex-1">
            <h1
              ref={heading}
              tabIndex={-1}
              className="wrap-break-word text-xl font-semibold leading-snug tracking-tight outline-none"
            >
              {m.user.name}
            </h1>
            <p className="mt-2 wrap-break-word text-sm leading-relaxed text-muted-foreground">
              {m.departments.map((d) => d.name).join(", ") ||
                "Chưa tham gia ban ngành"}
              <span aria-hidden="true"> – </span>
              <span>{m.churchStatus ?? statusLabels[m.status]}</span>
              {m.previousChurchStatus && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (trước: {m.previousChurchStatus})
                </span>
              )}
            </p>
          </div>
        </div>
        {editable && (
          <p className="mt-4 text-xs text-muted-foreground">
            Chạm vào thông tin bên dưới để chỉnh sửa.
          </p>
        )}
      </Card>
      <Card className="px-5 pb-2 pt-5">
        <h2 className="font-semibold">Thông tin cá nhân</h2>
        <dl className="mt-2 divide-y">
          {field(
            "name",
            "Họ và tên",
            UserRound,
            values.name,
            m.user.name,
            (name) => ({ name }),
          )}
          {field(
            "email",
            "Email",
            Mail,
            values.email,
            m.user.email || blank,
            (email) => ({ email }),
            "email",
          )}
          {field(
            "phone",
            "Số điện thoại",
            Phone,
            values.phone,
            m.phone || blank,
            (phone) => ({ phone }),
            "tel",
            undefined,
            {
              labelAction: m.phone?.trim() ? (
                <a
                  href={`tel:${m.phone.replace(/[^+\d]/g, "")}`}
                  className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Gọi điện
                </a>
              ) : undefined,
            },
          )}
          {(editable || m.dateOfBirth) &&
            field(
              "dateOfBirth",
              "Ngày sinh",
              CalendarDays,
              values.dateOfBirth,
              displayDate(m.dateOfBirth),
              (dateOfBirth) => ({ dateOfBirth }),
              "date",
            )}
          {field(
            "address",
            "Địa chỉ",
            MapPin,
            values.address,
            m.address || blank,
            (address) => ({ address }),
            undefined,
            undefined,
            {
              labelAction: m.address?.trim() ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(m.address.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Chỉ đường
                </a>
              ) : undefined,
            },
          )}
          {field(
            "area",
            "Khu vực",
            MapPin,
            values.area,
            m.area || blank,
            (area) => ({ area }),
            undefined,
            (draft, onChange) => (
              <AreaPicker
                value={draft}
                emptyValue=""
                onChange={(v) => onChange(v as MemberDetailInput["area"])}
              />
            ),
          )}
          {field(
            "location",
            "Phường/xã",
            MapPin,
            values.location,
            m.location || blank,
            (location) => ({ location }),
            undefined,
            (draft, onChange) => (
              <LocationPicker value={draft} emptyValue="" onChange={onChange} />
            ),
          )}
          {field(
            "occupation",
            "Nghề nghiệp",
            Briefcase,
            values.occupation,
            m.occupation || blank,
            (occupation) => ({ occupation }),
          )}
        </dl>
      </Card>
      {(editable || m.source || m.preferredName || m.gender) && (
        <Card className="px-5 pb-2 pt-5">
          <h2 className="font-semibold">Thông tin bổ sung</h2>
          <dl className="mt-2 divide-y">
            {field(
              "preferredName",
              "Tên thường gọi",
              UserRound,
              m.preferredName,
              m.preferredName || blank,
              (preferredName) => ({ preferredName }),
            )}
            {field(
              "gender",
              "Giới tính",
              UserRound,
              m.gender,
              m.gender || blank,
              (gender) => {
                if (gender !== "Nam" && gender !== "Nữ")
                  throw new Error("Vui lòng chọn Nam hoặc Nữ.");
                return { gender };
              },
              undefined,
              (draft, onChange) => (
                <Dropdown
                  aria-label="Giới tính"
                  required
                  value={draft === "Nam" || draft === "Nữ" ? draft : ""}
                  onChange={(event) => onChange(event.target.value)}
                  className="min-h-12 w-full"
                >
                  <option value="" disabled hidden>
                    Chọn giới tính
                  </option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </Dropdown>
              ),
            )}
            <InfoRow icon={UserRound} label="Tuổi">
              {getAge(m.dateOfBirth) ?? blank}
            </InfoRow>
            {field(
              "householdRole",
              "Vai trò trong gia đình",
              Users,
              m.householdRole,
              m.householdRole || blank,
              (householdRole) => ({ householdRole }),
            )}
          </dl>
          {m.source?.ambiguousHousehold && (
            <p className="pb-4 text-sm text-muted-foreground">
              Tên hộ có nhiều chủ hộ trùng nhau. Chưa tự động liên kết người
              thân.
            </p>
          )}
        </Card>
      )}
      <Card className="px-5 pb-2 pt-5">
        <div className="mb-2 flex items-center gap-3">
          <Users size={20} className="text-primary" />
          <h2 className="font-semibold">Gia đình</h2>
          {sectionUpdate("familyMembers", "Gia đình")}
        </div>
        {m.source && (
          <p className="py-2 text-xs text-muted-foreground">
            Vai trò được ghi theo hộ gia đình.
          </p>
        )}
        {(
          m.familyDetailsRestricted
            ? m.familySummaries?.length
            : m.family?.members.length
        ) ? (
          <ul className="divide-y">
            {(m.familyDetailsRestricted
              ? (m.familySummaries ?? [])
              : (m.family?.members ?? [])
            ).map((relative, index) => {
              return (
                <li
                  key={
                    "id" in relative
                      ? String(relative.id)
                      : `${relative.name}-${index}`
                  }
                >
                  <PersonCard
                    name={relative.name}
                    departments={relative.relationship}
                    href={
                      !m.familyDetailsRestricted && "id" in relative
                        ? (memberHref?.(String(relative.id)) ??
                          `/client/members/${relative.id}`)
                        : undefined
                    }
                    onOpen={
                      !m.familyDetailsRestricted && "id" in relative
                        ? (event) => {
                            if (
                              onOpenMember &&
                              "id" in relative &&
                              !event.metaKey &&
                              !event.ctrlKey &&
                              !event.shiftKey &&
                              !event.altKey &&
                              event.button === 0
                            ) {
                              event.preventDefault();
                              onOpenMember(String(relative.id));
                            }
                          }
                        : undefined
                    }
                    className="my-1"
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="pb-4">
            <EmptyState
              title="Chưa liên kết người thân"
              description="Các thành viên gia đình sẽ hiển thị khi được liên kết."
            />
          </div>
        )}
        {editable && active?.key === "familyMembers" && (
          <dl>
            {field(
              "familyMembers",
              "Gia đình",
              Users,
              values.familyMembers,
              null,
              (familyMembers) => ({
                familyMembers,
                familyName: values.familyName || "Gia đình",
              }),
              undefined,
              (draft, onChange) => (
                <FamilyEditor
                  org={org}
                  memberId={m.id}
                  value={draft}
                  onChange={onChange}
                />
              ),
              { hideLabel: true, actionLabel: "Cập nhật" },
            )}
          </dl>
        )}
      </Card>
      <Card className="px-5 pb-2 pt-5">
        <div className="mb-2 flex items-center gap-3">
          <Building2 size={20} className="text-primary" />
          <h2 className="font-semibold">Ban ngành</h2>
          {sectionUpdate("departmentIds", "Ban ngành")}
        </div>
        {m.departments.map((d) => (
          <div key={d.id} className="border-t py-2">
            <p className="pt-3 text-base font-medium">{d.name}</p>
            <dl>
              {field(
                `departmentRole:${d.id}`,
                `Vai trò trong ${d.name}`,
                Briefcase,
                ["Chưa cập nhật", "Thành viên", "Ban viên"].includes(d.position)
                  ? ""
                  : d.position,
                !d.position ||
                  ["Chưa cập nhật", "Thành viên"].includes(d.position)
                  ? "Ban viên"
                  : d.position,
                (next) => ({
                  departmentRoles: {
                    ...(active?.values.departmentRoles ??
                      values.departmentRoles),
                    [d.id]: next,
                  },
                }),
                undefined,
                undefined,
                {
                  hideLabel: true,
                  subdetail: true,
                  readOnly:
                    readOnlyAdministration ||
                    Boolean(
                      m.teamDepartmentIds &&
                      !m.teamDepartmentIds.includes(d.id),
                    ),
                },
              )}
            </dl>
          </div>
        ))}
        {!m.departments.length && (
          <p className="py-3 text-sm text-muted-foreground">
            Chưa tham gia ban ngành.
          </p>
        )}
        {editable && active?.key === "departmentIds" && (
          <dl>
            {field(
              "departmentIds",
              "Ban ngành",
              Building2,
              values.departmentIds,
              null,
              (departmentIds) => ({
                departmentIds,
                departmentRoles: Object.fromEntries(
                  Object.entries(
                    active?.values.departmentRoles ??
                      values.departmentRoles ??
                      {},
                  ).filter(([id]) => departmentIds.includes(id)),
                ),
              }),
              undefined,
              (draft, onChange) => (
                <DepartmentChoices value={draft} onChange={onChange} />
              ),
              { hideLabel: true, actionLabel: "Cập nhật" },
            )}
          </dl>
        )}
      </Card>
      <Card className="px-5 pb-2 pt-5">
        <h2 className="font-semibold">Thông tin trong Hội Thánh</h2>
        <dl className="mt-2 divide-y">
          {field(
            "churchStatus",
            "Tình trạng",
            UserRound,
            {
              status: values.churchStatus ?? "",
              destination: values.chuyenHoiDen ?? "",
            },
            m.churchStatus || blank,
            ({ status, destination }) => ({
              churchStatus: status,
              chuyenHoiDen: status === "Chuyển hội" ? destination : "",
            }),
            undefined,
            (draft, onChange) => (
              <div className="space-y-3">
                <div
                  role="radiogroup"
                  aria-label="Tình trạng"
                  className="space-y-2"
                >
                  {ChurchStatusSchema.options.map((status) => (
                    <label
                      key={status}
                      className="flex min-h-12 items-center gap-3 text-sm"
                    >
                      <input
                        type="radio"
                        name="churchStatus"
                        value={status}
                        checked={draft.status === status}
                        onChange={() => onChange({ ...draft, status })}
                        className="size-5 accent-primary"
                      />
                      {status}
                    </label>
                  ))}
                </div>
                {draft.status === "Chuyển hội" && (
                  <label className="member-ui-enter block space-y-2 text-sm">
                    <span>Điểm đến chuyển hội (không bắt buộc)</span>
                    <Input
                      className="profile-edit-input"
                      value={draft.destination}
                      maxLength={200}
                      placeholder="Nhập Hội Thánh hoặc địa điểm chuyển đến"
                      onChange={(event) =>
                        onChange({ ...draft, destination: event.target.value })
                      }
                    />
                  </label>
                )}
              </div>
            ),
          )}
          {values.churchStatus === "Chuyển hội" &&
            active?.key !== "churchStatus" &&
            field(
              "chuyenHoiDen",
              "Điểm đến chuyển hội (không bắt buộc)",
              MapPin,
              values.chuyenHoiDen ?? "",
              m.chuyenHoiDen || blank,
              (chuyenHoiDen) => ({ chuyenHoiDen }),
              "text",
            )}
          {m.membershipDateKnown && (
            <InfoRow icon={CalendarDays} label="Ngày tham gia">
              {formatDate(m.joinedAt)}
            </InfoRow>
          )}
          {field(
            "baptismDate",
            "Ngày báp-têm",
            CalendarDays,
            m.baptismDate ?? "",
            displayDate(m.baptismDate),
            (baptismDate) => ({ baptismDate }),
            "date",
          )}
          {field(
            "faithDate",
            "Ngày tin Chúa",
            CalendarDays,
            m.faithDate ?? "",
            displayDate(m.faithDate),
            (faithDate) => ({ faithDate }),
            "date",
          )}
          <InfoRow icon={UserRound} label="Mã thành viên">
            <span className="break-all font-mono text-xs">{m.id}</span>
          </InfoRow>
        </dl>
        <VisitHistory
          org={org}
          member={m}
          editable={editable}
          onUpdated={onUpdated}
        />
      </Card>
      <MemberNotes
        org={org}
        member={m}
        editable={editable}
        onUpdated={onUpdated}
      />
    </div>
  );
}
