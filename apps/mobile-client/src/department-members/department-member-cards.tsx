import type { DirectoryQuery } from "@org/core";
import { Button } from "@org/ui";
import { Plus } from "lucide-react";
import { PersonCard } from "../person-card";
import { MemberCardMenu } from "../member-card-menu";
import type { DepartmentMember as Person } from "./types";
export function DepartmentMemberCards({
  items,
  selected,
  boardYear,
  readOnly,
  selecting,
  fullMembers,
  ownDepartments,
  busy,
  searchAll,
  department,
  org,
  toggle,
  setRoleMember,
  setFilterStatuses,
  addMember,
  onOpenProfile,
  profileHref,
}: {
  items: Person[];
  selected: Person[];
  boardYear: number | null;
  readOnly: boolean;
  selecting: boolean;
  fullMembers: boolean;
  ownDepartments: ReadonlySet<string>;
  busy: boolean;
  searchAll: boolean;
  department: { id: string; name: string };
  org: string;
  toggle: (person: Person) => void;
  setRoleMember: (person: Person) => void;
  setFilterStatuses: (
    statuses: NonNullable<DirectoryQuery["churchStatuses"]>,
  ) => void;
  addMember: (id: string) => void;
  onOpenProfile?: (id: string) => void;
  profileHref?: (id: string) => string;
}) {
  return (
    <ul className="space-y-2">
      {items.map((person, index) => {
        const checked = selected.some((item) => item.id === person.id);
        const canViewProfile =
          fullMembers ||
          (
            person.departmentIds ?? (person.isMember ? [department.id] : [])
          ).some((id) => ownDepartments.has(id));
        const editRole = boardYear !== null && !readOnly;
        const choose = () =>
          boardYear !== null ? setRoleMember(person) : toggle(person);
        return (
          <li key={person.id}>
            <PersonCard
              name={person.name}
              href={
                selecting || editRole || !canViewProfile
                  ? undefined
                  : (profileHref?.(person.id) ??
                    `/client/members/${encodeURIComponent(person.id)}`)
              }
              onOpen={
                canViewProfile
                  ? (event) => {
                      if (selecting || editRole) {
                        choose();
                        return;
                      }
                      if (
                        onOpenProfile &&
                        !event.metaKey &&
                        !event.ctrlKey &&
                        !event.shiftKey &&
                        !event.altKey &&
                        event.button === 0
                      ) {
                        event.preventDefault();
                        onOpenProfile(person.id);
                      }
                    }
                  : undefined
              }
              status={person.churchStatus ?? null}
              onFilterStatus={(status) => setFilterStatuses([status])}
              departments={
                [
                  person.isMember
                    ? person.position?.trim().toLocaleLowerCase("vi") ===
                      "ban viên"
                      ? null
                      : person.position
                    : "Chưa thuộc Ban ngành",
                  ...(person.departmentNames ?? []).filter(
                    (name) => name !== department.name,
                  ),
                ]
                  .filter(Boolean)
                  .join(" · ") || null
              }
              phone={person.phone}
              email={person.email}
              colorIndex={index}
              selected={checked}
              onAvatarClick={readOnly ? undefined : choose}
              avatarLabel={
                (boardYear !== null ? "Phân công " : "Chọn ") + person.name
              }
              disabled={busy}
              actions={
                canViewProfile ? (
                  <div className="flex items-center gap-1">
                    {searchAll && !person.isMember && !selecting && (
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={busy}
                        aria-label={"Thêm " + person.name}
                        onClick={() => addMember(person.id)}
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                    <MemberCardMenu
                      org={org}
                      member={{
                        ...person,
                        canEdit: canViewProfile,
                        departmentIds:
                          person.departmentIds ??
                          (person.isMember ? [department.id] : []),
                      }}
                      onEdit={
                        onOpenProfile
                          ? () => onOpenProfile(person.id)
                          : undefined
                      }
                      profileHref={profileHref?.(person.id)}
                    />
                  </div>
                ) : undefined
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
