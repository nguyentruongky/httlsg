import { MemberCardMenu } from "../member-card-menu";
import { PersonCard } from "../person-card";
import { navigateClient } from "../client-router";
import type { CompactMember } from "@org/core";
import type { MemberDirectoryState } from "./use-member-directory";
export function DirectoryCards({
  state,
  org,
  onOpen,
}: {
  state: Pick<MemberDirectoryState, "members" | "memberHref" | "setOptions">;
  org: string;
  onOpen: () => void;
}) {
  const { members, memberHref, setOptions } = state;
  return (
    <ul className="space-y-2">
      {members.map((d: CompactMember, i) => (
        <li key={d.id}>
          <PersonCard
            name={d.user.name}
            href={memberHref(d.id)}
            onOpen={onOpen}
            status={d.churchStatus}
            onFilterStatus={(status) =>
              setOptions((value) => ({
                ...value,
                churchStatuses: [status],
              }))
            }
            departments={
              d.departments.map((department) => department.name).join(", ") ||
              "Chưa tham gia ban ngành"
            }
            phone={d.phone}
            email={d.user.email}
            colorIndex={i}
            actions={
              <MemberCardMenu
                org={org}
                member={{
                  id: d.id,
                  userId: d.userId,
                  name: d.user.name,
                  phone: d.phone,
                  email: d.user.email,
                  accountStatus: d.status,
                  version: d.version,
                  churchStatus: d.churchStatus,
                  departmentIds: d.departments.map(
                    (department) => department.id,
                  ),
                  canEdit: d.canEdit,
                }}
                profileHref={memberHref(d.id)}
                onEdit={() => {
                  onOpen();
                  navigateClient(memberHref(d.id));
                }}
              />
            }
          />
        </li>
      ))}
    </ul>
  );
}
