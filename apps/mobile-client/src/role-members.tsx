"use client";
import { PersonCard } from "./person-card";
import { MemberCardMenu } from "./member-card-menu";
import {
  ListPageHeader,
  ListControls,
  ListSearchToolbar,
  ListResultsSummary,
} from "./list-controls";
import { PersonnelFilters } from "./personnel-filters";
import { useDebouncedSearch } from "./use-debounced-search";

import { useLoadingTiming } from "./use-loading-timing";
import { AutoLoadMore } from "./auto-load-more";
import { useState } from "react";
import { UserCog } from "lucide-react";
import {
  departments as departmentOptions,
  accessRoleLabels,
  type AccessRole,
  useAuth,
  useWorkspace,
} from "@org/core";
import { Card, EmptyState, ErrorMessage } from "@org/ui";
import { PersonnelAssignment } from "./personnel/personnel-assignment";
import { usePersonnel } from "./personnel/use-personnel";
import { getPersonnel } from "./personnel/api";
import { personnelCsv, sortPersonnelDepartments } from "./personnel/formatting";
import { downloadCsv } from "./csv-export";
export function RoleMembers({
  fixedViewport = false,
}: {
  fixedViewport?: boolean;
}) {
  const auth = useAuth();
  const { organizationId } = useWorkspace();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const term = useDebouncedSearch(search);
  const [roles, setRoles] = useState<string[]>([]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [churchStatuses, setChurchStatuses] = useState<string[]>([]);
  const { query, params } = usePersonnel({
    search,
    term,
    roles,
    departmentIds,
    churchStatuses,
    userId: auth?.user?.id,
  });
  useLoadingTiming("personnel", query.isPending);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const departments = departmentOptions;
  const sortedDepartments = sortPersonnelDepartments(departments);
  const filtered = items;
  async function exportCsv() {
    const all = await getPersonnel(params);
    downloadCsv(personnelCsv(all.items), "nhan-su-hoi-thanh.csv");
  }
  return (
    <div
      className={
        fixedViewport
          ? "fixed-list flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
          : "min-w-0"
      }
    >
      <div className={fixedViewport ? "shrink-0 bg-background" : undefined}>
        <ListPageHeader
          title="Nhân sự"
          icon={<UserCog />}
          description="Ban điều hành, Trưởng ban ngành, Chấp sự, Đặc trách và nhân sự trong Hội Thánh."
        />
        <Card className="overflow-hidden border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-xs">
          <ListControls className="space-y-6 lg:space-y-0">
            <ListSearchToolbar
              value={search}
              onChange={setSearch}
              label="Tìm nhân sự"
              onFilter={() => setFiltersOpen(true)}
              chips={[
                ...roles.map((role) => ({
                  key: `role:${role}`,
                  label: accessRoleLabels[role as AccessRole] ?? role,
                  onRemove: () =>
                    setRoles((value) => value.filter((item) => item !== role)),
                })),
                ...departmentIds.map((id) => ({
                  key: `department:${id}`,
                  label: departments.find((item) => item.id === id)?.name ?? id,
                  onRemove: () =>
                    setDepartmentIds((value) =>
                      value.filter((item) => item !== id),
                    ),
                })),
                ...churchStatuses.map((status) => ({
                  key: `status:${status}`,
                  label: status,
                  onRemove: () =>
                    setChurchStatuses((value) =>
                      value.filter((item) => item !== status),
                    ),
                })),
              ]}
              filterCount={
                roles.length + departmentIds.length + churchStatuses.length
              }
            />
            <ListResultsSummary onDownload={exportCsv}>
              {query.data?.pages[0]?.total ?? 0} nhân sự
            </ListResultsSummary>
          </ListControls>
        </Card>
      </div>
      <PersonnelFilters
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        roles={roles}
        departmentIds={departmentIds}
        churchStatuses={churchStatuses}
        departments={sortedDepartments}
        onApply={(nextRoles, nextDepartments, nextStatuses) => {
          setRoles(nextRoles);
          setDepartmentIds(nextDepartments);
          setChurchStatuses(nextStatuses);
        }}
      />

      <div
        data-scroll-restoration={
          fixedViewport ? "personnel-results" : undefined
        }
        className={
          fixedViewport
            ? "min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4"
            : undefined
        }
      >
        {query.isPending ? (
          <p role="status">Đang tải…</p>
        ) : query.error && !query.data ? (
          <ErrorMessage error={query.error} />
        ) : !filtered.length ? (
          <EmptyState
            title="Không có thành viên phù hợp"
            description="Điều chỉnh bộ lọc hoặc phân công vai trò mới."
          />
        ) : (
          <ul className="space-y-2" aria-label="Danh sách nhân sự">
            {filtered.map((member, index) => (
              <li key={member.id}>
                <PersonCard
                  name={member.name}
                  href={`/client/members/${member.id}`}
                  status={member.churchStatus ?? null}
                  onFilterStatus={(status) => setChurchStatuses([status])}
                  departments={<PersonnelAssignment member={member} />}
                  phone={member.phone}
                  email={member.email}
                  actions={
                    <MemberCardMenu
                      org={organizationId}
                      member={{
                        id: member.id,
                        name: member.name,
                        phone: member.phone,
                        email: member.email,
                        version: member.version,
                        churchStatus: member.churchStatus,
                        departmentIds: member.departmentIds,
                        accountStatus: member.accountStatus,
                      }}
                    />
                  }
                  colorIndex={index}
                />
              </li>
            ))}
          </ul>
        )}
        <AutoLoadMore query={query} enabled={term === search.trim()} />
      </div>
    </div>
  );
}
