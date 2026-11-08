import { PwaDeviceSettings } from "./pwa-settings";
import { formatDate } from "./date-input";
import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Briefcase,
  Users,
  Building2,
  ChevronRight,
  Sun,
  Moon,
  UserRound,
  Plus,
  Trash2,
} from "lucide-react";
import {
  canEditMemberDetails,
  demo,
  getDirectoryMember,
  getMyProfile,
  getMemberOptions,
  getAge,
  MemberDetailInputSchema,
  ChurchStatusSchema,
  useAuth,
  hasDashboard,
  isUserOnly,
  isTeamScopedUser,
  apiRequest,
  type DirectoryMember,
  type MemberDetailInput,
} from "@org/core";
import { Avatar, Button, Card, EmptyState, Input, Select } from "@org/ui";
import { DirectoryLoading } from "./member-directory";
import {
  DepartmentChoices,
  AreaPicker,
  LocationPicker,
} from "./directory-fields";
import { MemberNotes, VisitHistory } from "./member-history";
import { InlineMemberField } from "./inline-member-field";
import { ClientError, statusLabels } from "./locale";
export function MemberDetail({
  org,
  memberId,
  profile = false,
  team = false,
  returnHref,
  onBack,
  hideBackButton = false,
  onOpenMember,
  memberHref,
}: {
  org: string;
  memberId?: string;
  profile?: boolean;
  team?: boolean | "board";
  returnHref?: string;
  onBack?: () => void;
  hideBackButton?: boolean;
  onOpenMember?: (id: string) => void;
  memberHref?: (id: string) => string;
}) {
  const client = useQueryClient();
  const auth = useAuth();
  const assigned = Boolean(auth?.user && isTeamScopedUser(auth.user));
  const profileOnly = Boolean(auth?.user && isUserOnly(auth.user));
  const back =
    returnHref ??
    (profileOnly
      ? "#/profile"
      : team
        ? "#/" + (team === "board" ? "board" : "leader") + "/members"
        : "#/members");
  const query = useQuery({
    queryKey: [
      "organizations",
      org,
      profile
        ? "my-profile"
        : team === "board"
          ? "board-team-member"
          : team
            ? "team-member"
            : assigned
              ? "assigned-member"
              : "member",
      ...(profile ? [] : [memberId]),
    ],
    queryFn: () =>
      profile
        ? getMyProfile(org)
        : team
          ? apiRequest<DirectoryMember>(
              `/api/${team === "board" ? "board" : "leader"}/members/${memberId}`,
            )
          : getDirectoryMember(org, memberId!),
    staleTime: assigned && !profile ? 0 : 30_000,
  });
  const actor = useQuery({
    queryKey: ["organizations", org, "my-profile"],
    queryFn: () => getMyProfile(org),
    staleTime: 30_000,
  });
  if (query.isPending) return <DirectoryLoading />;
  if (query.isError)
    return (
      <div className="space-y-4">
        <ClientError error={query.error} />
        <Button variant="outline" onClick={() => query.refetch()}>
          Thử lại
        </Button>
        <Button asChild variant="ghost">
          <a
            href={back}
            onClick={(event) => {
              if (onBack) {
                event.preventDefault();
                onBack();
              }
            }}
          >
            Về danh sách
          </a>
        </Button>
      </div>
    );
  return (
    <section aria-label={profile ? "Hồ sơ cá nhân" : "Chi tiết thành viên"}>
      <MemberInformation
        key={`${org}-${query.data.id}-${team}`}
        org={org}
        member={query.data}
        profile={profile}
        backHref={back}
        onBack={onBack}
        hideBackButton={hideBackButton}
        onOpenMember={onOpenMember}
        memberHref={memberHref}
        editable={
          query.data.canEdit ?? canEditMemberDetails(actor.data, query.data)
        }
        onUpdated={() =>
          client.invalidateQueries({ queryKey: ["organizations", org] })
        }
        onPersist={async (values, version) => {
          if (team)
            await apiRequest(
              `/api/${team === "board" ? "board" : "leader"}/members/${query.data.id}`,
              {
                method: "PATCH",
                body: JSON.stringify({ values, version }),
              },
            );
          else await demo.updateDetails(org, query.data.id, values, version);
          await client.invalidateQueries({ queryKey: ["organizations", org] });
        }}
      />
      {profile && <ProfileSettings />}
    </section>
  );
}
function valuesFor(m: DirectoryMember): MemberDetailInput {
  return {
    name: m.user.name,
    email: m.user.email ?? "",
    phone: m.phone ?? "",
    dateOfBirth: m.dateOfBirth ?? "",
    address: m.address ?? "",
    occupation: m.occupation ?? "",
    bio: m.bio,
    departmentIds: m.departments.map((d) => d.id),
    departmentRoles: Object.fromEntries(
      m.departments.map((d) => [
        d.id,
        d.position === "Chưa cập nhật" ? "" : d.position,
      ]),
    ),
    area: m.area ?? "",
    location: m.location ?? "",
    position: m.position,
    familyName: m.family?.name ?? "",
    churchStatus: m.churchStatus ?? "",
    familyMembers:
      m.family?.members.map(({ id, relationship }) => ({ id, relationship })) ??
      [],
    faithDate: m.faithDate ?? "",
    baptismDate: m.baptismDate ?? "",
    lastVisitDate: m.lastVisitDate ?? "",
    preferredName: m.preferredName,
    gender: m.gender,
    householdRole: m.householdRole,
  };
}
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
function MemberInformation({
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
        disabled={mutation.isPending || Boolean(active)}
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
        disabled={mutation.isPending || Boolean(active && active.key !== key)}
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
            onClick={(event) => {
              if (onBack) {
                event.preventDefault();
                onBack();
              }
            }}
            aria-label={
              backHref === "#/profile"
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
      {(m.source || m.preferredName || m.gender) && (
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
              (gender) => ({ gender }),
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
              const contents = (
                <>
                  <Avatar name={relative.name} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{relative.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relative.relationship}
                    </p>
                  </div>
                </>
              );
              return (
                <li
                  key={
                    "id" in relative
                      ? String(relative.id)
                      : `${relative.name}-${index}`
                  }
                >
                  {!m.familyDetailsRestricted && "id" in relative ? (
                    <a
                      href={
                        memberHref?.(String(relative.id)) ??
                        "#/members/" + relative.id
                      }
                      onClick={(event) => {
                        if (
                          onOpenMember &&
                          !event.metaKey &&
                          !event.ctrlKey &&
                          !event.shiftKey &&
                          !event.altKey &&
                          event.button === 0
                        ) {
                          event.preventDefault();
                          onOpenMember(String(relative.id));
                        }
                      }}
                      className="flex min-h-20 items-center gap-3 py-3 hover:bg-muted/50"
                    >
                      {contents}
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground"
                      />
                    </a>
                  ) : (
                    <div className="flex min-h-20 items-center gap-3 py-3">
                      {contents}
                    </div>
                  )}
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
                  readOnly: Boolean(
                    m.teamDepartmentIds && !m.teamDepartmentIds.includes(d.id),
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
            values.churchStatus ?? "",
            m.churchStatus || blank,
            (churchStatus) => ({ churchStatus }),
            undefined,
            (draft, onChange) => (
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
                      checked={draft === status}
                      onChange={() => onChange(status)}
                      className="size-5 accent-primary"
                    />
                    {status}
                  </label>
                ))}
              </div>
            ),
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
function FamilyEditor({
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
            <Select
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
            </Select>
          </label>
          <label className="block text-sm">
            Mối quan hệ
            <Input
              aria-label={`Mối quan hệ ${index + 1}`}
              className="mt-2 min-h-12"
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
function ProfileSettings() {
  const { resolvedTheme, setTheme } = useTheme();
  const auth = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  return (
    <>
      {auth?.user && hasDashboard(auth.user.role) && (
        <Card className="mt-5">
          <a
            href="/dashboard"
            className="flex min-h-16 items-center justify-between px-5 text-sm"
          >
            Mở trang quản trị <ChevronRight size={17} />
          </a>
        </Card>
      )}
      <Card className="mt-5 overflow-hidden">
        <h2 className="px-5 py-4 font-semibold">Cài đặt thiết bị</h2>
        <button
          type="button"
          aria-label="Đổi giao diện"
          className="flex min-h-16 w-full items-center gap-3 border-t px-5 text-left text-sm"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? (
            <Moon size={20} className="text-primary" />
          ) : (
            <Sun size={20} className="text-primary" />
          )}
          <span className="flex-1">Đổi giao diện</span>
          <span className="text-muted-foreground">
            {resolvedTheme === "dark" ? "Tối" : "Sáng"}
          </span>
        </button>
      </Card>
      <PwaDeviceSettings />
      {auth?.user && (
        <Button
          variant="outline"
          size="touch"
          className="mt-4 w-full"
          onClick={() => {
            setLogoutError(null);
            void auth
              .signOut()
              .catch(() =>
                setLogoutError("Không thể đăng xuất. Vui lòng thử lại."),
              );
          }}
        >
          Đăng xuất
        </Button>
      )}
      {auth?.user && (
        <Button
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => {
            setLogoutError(null);
            void auth
              .signOutAll()
              .catch(() =>
                setLogoutError(
                  "Không thể đăng xuất tất cả thiết bị. Vui lòng thử lại.",
                ),
              );
          }}
        >
          Đăng xuất tất cả thiết bị
        </Button>
      )}
      {logoutError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {logoutError}
        </p>
      )}
      {!auth && (
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          Bạn đang xem hồ sơ mẫu.
          <br />
          Thông tin cá nhân và gia đình là dữ liệu minh họa.
        </p>
      )}
    </>
  );
}
