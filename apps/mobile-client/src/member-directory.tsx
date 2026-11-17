import type { Ref } from "react";
import { Button } from "@org/ui";
import { ClientError } from "./locale";
import { MemberFilters } from "./member-filters";
import { useMemberDirectory } from "./member-directory/use-member-directory";
import { DirectoryToolbar } from "./member-directory/directory-toolbar";
import { DirectoryResults } from "./member-directory/directory-results";
export { DirectoryLoading } from "./member-directory/directory-loading";
export function MemberDirectory({
  org,
  active,
  onOpen,
  scrollRef,
  team: requestedTeam = false,
  assigned: requestedAssigned = false,
}: {
  org: string;
  active: boolean;
  onOpen: () => void;
  scrollRef?: Ref<HTMLDivElement>;
  team?: boolean | "board";
  assigned?: boolean;
}) {
  const state = useMemberDirectory({
    org,
    active,
    team: requestedTeam,
    assigned: requestedAssigned,
  });
  const {
    team,
    assigned,
    departmentOptions,
    filterOptions,
    open,
    setOpen,
    options,
    setOptions,
  } = state;
  return (
    <section
      aria-label={team ? "Thành viên trong Ban ngành" : "Danh sách thành viên"}
      className="flex h-full min-h-0 flex-col overflow-hidden"
    >
      <h1 className="sr-only">
        {team ? "Thành viên trong Ban ngành" : "Danh sách thành viên"}
      </h1>
      <DirectoryToolbar
        team={team}
        search={state.search}
        setSearch={state.setSearch}
        count={state.count}
        setOpen={setOpen}
        options={options}
        setOptions={setOptions}
        departmentOptions={departmentOptions}
      />
      <div
        ref={scrollRef}
        data-scroll-restoration={team ? `directory-${team}` : "directory"}
        role="region"
        aria-label="Kết quả danh sách"
        tabIndex={0}
        className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-none px-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <DirectoryResults state={state} org={org} onOpen={onOpen} />
      </div>
      {assigned && filterOptions.isError && (
        <div className="px-5 py-3">
          <ClientError error={filterOptions.error} />
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              void filterOptions.refetch();
            }}
          >
            Thử tải bộ lọc
          </Button>
        </div>
      )}
      <MemberFilters
        departmentOptions={departmentOptions}
        sections={[
          "personnel",
          "department",
          "area",
          "location",
          "age",
          "status",
        ]}
        areaOptions={assigned ? (filterOptions.data?.areas ?? []) : undefined}
        locationOptions={
          assigned ? (filterOptions.data?.locations ?? []) : undefined
        }
        open={open}
        onOpenChange={setOpen}
        value={options}
        onApply={setOptions}
      />
    </section>
  );
}
