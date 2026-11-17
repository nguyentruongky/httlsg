import { MemberCardMenu } from "../member-card-menu";
import { PersonCard } from "../person-card";
import { navigateClient } from "../client-router";
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
      {members.map((m, i) => (
        <li key={m.id}>
          <PersonCard
            name={m.user.name}
            href={memberHref(m.id)}
            onOpen={onOpen}
            status={m.churchStatus}
            onFilterStatus={(status) =>
              setOptions((value) => ({
                ...value,
                churchStatuses: [status],
              }))
            }
            departments={
              m.departments.map((d) => d.name).join(", ") ||
              "Chưa tham gia ban ngành"
            }
            phone={m.phone}
            email={m.user.email}
            colorIndex={i}
            actions={
              <MemberCardMenu
                org={org}
                member={{
                  id: m.id,
                  userId: m.userId,
                  name: m.user.name,
                  phone: m.phone,
                  email: m.user.email,
                  accountStatus: m.status,
                  version: m.version,
                  churchStatus: m.churchStatus,
                  chuyenHoiDen: m.chuyenHoiDen,
                  departmentIds: m.departments.map(
                    (department) => department.id,
                  ),
                  canEdit: m.canEdit,
                }}
                profileHref={memberHref(m.id)}
                onEdit={() => {
                  onOpen();
                  navigateClient(memberHref(m.id));
                }}
              />
            }
          />
        </li>
      ))}
    </ul>
  );
}
