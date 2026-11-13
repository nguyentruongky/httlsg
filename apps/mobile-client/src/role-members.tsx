"use client";
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
import { navigateClient } from "./client-router";
import {
  Mail,
  MoreVertical,
  SlidersHorizontal,
  Phone,
  UserCog,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  canCalendar,
  useAuth,
  useWorkspace,
  invalidateMemberReads,
} from "@org/core";
import {
  Avatar,
  Button,
  Card,
  DropdownMenu,
  MenuItem,
  EmptyState,
  ErrorMessage,
} from "@org/ui";
import type { AssignedMember } from "./personnel/types";
import { PersonnelAssignment } from "./personnel/personnel-assignment";
import { PersonnelActions } from "./personnel/personnel-actions";
import { usePersonnel } from "./personnel/use-personnel";
import { getPersonnel } from "./personnel/api";
import { personnelCsv, sortPersonnelDepartments } from "./personnel/formatting";
import { downloadCsv } from "./csv-export";
import { PersonnelMissionsDialog } from "./personnel-missions-dialog";
import { AccountCredentials } from "./account-credentials";
export function RoleMembers() {
  const auth = useAuth();
  const { organizationId } = useWorkspace();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const term = useDebouncedSearch(search);
  const [roles, setRoles] = useState<string[]>([]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [target, setTarget] = useState<AssignedMember | null>(null);
  const [credentials, setCredentials] = useState<AssignedMember | null>(null);
  const { query, params } = usePersonnel({
    search,
    term,
    roles,
    departmentIds,
    userId: auth?.user?.id,
  });
  useLoadingTiming("personnel", query.isPending);
  if (query.isPending) return <p role="status">Đang tải…</p>;
  if (query.error && !query.data) return <ErrorMessage error={query.error} />;
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const departments = query.data?.pages[0]?.departments ?? [];
  const sortedDepartments = sortPersonnelDepartments(departments);
  const filtered = items;
  function actions(member: AssignedMember) {
    return (
      <PersonnelActions
        member={member}
        onEdit={() => navigateClient(`/client/members/${member.id}`)}
        onMissions={() => setTarget(member)}
        onCredentials={() => setCredentials(member)}
      />
    );
  }
  async function exportCsv() {
    const all = await getPersonnel(params);
    downloadCsv(personnelCsv(all.items), "nhan-su-hoi-thanh.csv");
  }
  return (
    <div className="min-w-0">
      <ListPageHeader
        title="Nhân sự"
        icon={<UserCog />}
        description="Ban điều hành, Trưởng ban ngành, Chấp sự, Đặc trách và nhân sự trong Hội Thánh."
      >
        <DropdownMenu
          animateOnMobile
          label=""
          trigger={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Menu nhân sự Hội Thánh"
            >
              <MoreVertical size={21} />
            </Button>
          }
        >
          {canCalendar(auth?.user, "calendar.groups") && (
            <MenuItem
              onSelect={() =>
                navigateClient("/dashboard/calendar/email-groups")
              }
            >
              <Mail size={17} />
              Nhóm email thông báo
            </MenuItem>
          )}
          <MenuItem
            onSelect={() => navigateClient("/dashboard/admin/roles/settings")}
          >
            <SlidersHorizontal size={17} />
            Cấu hình quyền
          </MenuItem>
        </DropdownMenu>
      </ListPageHeader>
      <Card className="overflow-hidden border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-xs">
        <ListControls className="space-y-6 lg:space-y-0">
          <ListSearchToolbar
            value={search}
            onChange={setSearch}
            label="Tìm nhân sự"
            onFilter={() => setFiltersOpen(true)}
            filterCount={roles.length + departmentIds.length}
          />
          <ListResultsSummary onDownload={exportCsv}>
            {query.data?.pages[0]?.total ?? 0} nhân sự
          </ListResultsSummary>
        </ListControls>
      </Card>
      <PersonnelFilters
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        roles={roles}
        departmentIds={departmentIds}
        departments={sortedDepartments}
        onApply={(nextRoles, nextDepartments) => {
          setRoles(nextRoles);
          setDepartmentIds(nextDepartments);
        }}
      />

      {!filtered.length ? (
        <EmptyState
          title="Không có thành viên phù hợp"
          description="Điều chỉnh bộ lọc hoặc phân công vai trò mới."
        />
      ) : (
        <div className="space-y-3">
          <ul className="space-y-3 md:hidden" aria-label="Danh sách nhân sự">
            {filtered.map((member, index) => (
              <li
                key={member.id}
                onClick={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.currentTarget.contains(event.target) &&
                    !event.target.closest(
                      'a,button,input,select,textarea,[role="button"],[role="menuitem"]',
                    )
                  )
                    navigateClient(`/client/members/${member.id}`);
                }}
              >
                <Card className="min-w-0 cursor-pointer p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={member.name}
                      variant="member"
                      colorIndex={index}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="pt-1 text-base leading-snug font-semibold wrap-break-word">
                        <a href={`/client/members/${member.id}`}>
                          {member.name}
                        </a>
                      </h2>
                      <div className="mt-2">
                        <PersonnelAssignment member={member} />
                      </div>
                    </div>
                    {actions(member)}
                  </div>
                  {(member.phone || member.email) && (
                    <div className="mt-3 grid gap-1 border-t pt-2">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone.replace(/[^+0-9]/g, "")}`}
                          className="inline-flex w-fit max-w-full min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Phone size={15} className="shrink-0" />
                          <span className="wrap-break-word">
                            {member.phone}
                          </span>
                        </a>
                      )}
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="flex min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Mail size={15} className="shrink-0" />
                          <span className="break-all">{member.email}</span>
                        </a>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="w-[26%] p-4 font-medium">Thành viên</th>
                  <th className="w-[25%] p-4 font-medium">Liên hệ</th>
                  <th className="p-4 font-medium">Vai trò / Ban ngành</th>
                  <th className="w-20 p-4 text-right font-medium">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((member, index) => (
                  <tr
                    key={member.id}
                    className="cursor-pointer align-middle"
                    onClick={(event) => {
                      if (
                        event.target instanceof Element &&
                        event.currentTarget.contains(event.target) &&
                        !event.target.closest(
                          'a,button,input,select,textarea,[role="button"],[role="menuitem"]',
                        )
                      )
                        navigateClient(`/client/members/${member.id}`);
                    }}
                  >
                    <td className="p-4 font-medium wrap-break-word">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={member.name}
                          variant="member"
                          colorIndex={index}
                        />
                        <a
                          href={`/client/members/${member.id}`}
                          className="min-w-0"
                        >
                          {member.name}
                        </a>
                      </div>
                    </td>
                    <td className="space-y-1 p-4 text-muted-foreground">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone.replace(/[^+0-9]/g, "")}`}
                          className="inline-block w-fit max-w-full wrap-break-word hover:underline"
                        >
                          {member.phone}
                        </a>
                      )}
                      {member.email && (
                        <p className="break-all">{member.email}</p>
                      )}
                      {!member.phone && !member.email && "—"}
                    </td>
                    <td className="p-4">
                      <PersonnelAssignment member={member} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">{actions(member)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
      <AutoLoadMore query={query} enabled={term === search.trim()} />
      {credentials && (
        <AccountCredentials
          member={{
            id: credentials.id,
            phone: credentials.phone,
            user: { email: credentials.email },
          }}
          org={organizationId}
          onClose={() => {
            setCredentials(null);
            void client.invalidateQueries({
              queryKey: ["admin-assigned-roles"],
            });
          }}
        />
      )}
      {target && (
        <PersonnelMissionsDialog
          key={target.id}
          target={target}
          onClose={() => setTarget(null)}
          onSaved={() => {
            void invalidateMemberReads(client, organizationId);
          }}
        />
      )}
    </div>
  );
}
