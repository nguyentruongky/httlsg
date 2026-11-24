import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@org/core";
import {
  Button,
  Dialog,
  DropdownMenu,
  Input,
  MenuItem,
  useToast,
} from "@org/ui";
import { ChevronDown, ChevronRight, MoreVertical } from "lucide-react";
type Person = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  departments?: Array<{ id: string; name: string }>;
  has_account?: boolean;
  has_role?: boolean;
  enabled?: boolean;
  active_assignment?: boolean;
  team_id?: string | null;
  team_name?: string | null;
  position?: number | null;
};
type Team = {
  id: string;
  name: string;
  members: Person[];
};
type ScrutineerData = {
  candidates: Person[];
  scrutineers: Person[];
  teams: Team[];
  unassigned: Person[];
  createdTeamId?: string;
};
export function ScrutineerManager({
  election,
  refresh,
  electionName,
}: {
  election: number;
  refresh: () => Promise<void>;
  electionName?: string;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<ScrutineerData>({
    candidates: [],
    scrutineers: [],
    teams: [],
    unassigned: [],
  });
  const teams = data.teams;
  const initializedExpansion = useRef(false);
  const busyRef = useRef(false);
  const dragRef = useRef<{
    teamId: string;
    memberId: string;
    targetId: string;
    left: number;
    top: number;
    width: number;
    offsetX: number;
    offsetY: number;
    person: Person;
  } | null>(null);
  const [drag, setDrag] = useState<typeof dragRef.current>(null);
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(
    new Set(),
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTeamId, setAddTeamId] = useState<string | null>(null);
  const [addTeamName, setAddTeamName] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<Person[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removePerson, setRemovePerson] = useState<{
    person: Person;
    team: Team;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const applyRoster = useCallback((result: ScrutineerData) => {
    // Team IDs, membership and order come only from the committed database rows.
    setData(result);
    if (!initializedExpansion.current) {
      initializedExpansion.current = true;
      setExpandedTeamIds(new Set(result.teams.map((team) => team.id)));
    }
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      applyRoster(
        await apiRequest<ScrutineerData>(
          `/api/elections/${election}/scrutineers`,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [election, applyRoster]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void apiRequest<ScrutineerData>(`/api/elections/${election}/scrutineers`)
      .then((result) => {
        if (active) applyRoster(result);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [election, applyRoster]);
  useEffect(() => {
    if (!addDialogOpen || !addSearch.trim()) {
      setAddResults([]);
      setAddLoading(false);
      return;
    }
    let active = true;
    setAddLoading(true);
    setAddResults([]);
    const timer = setTimeout(() => {
      void apiRequest<ScrutineerData>(
        `/api/elections/${election}/scrutineers?search=${encodeURIComponent(addSearch)}`,
      )
        .then((result) => {
          if (active) setAddResults(result.candidates);
        })
        .catch((error) => {
          if (active) setError(error.message);
        })
        .finally(() => {
          if (active) setAddLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [addDialogOpen, addSearch, election]);
  const isTeamExpanded = (teamId: string) => expandedTeamIds.has(teamId);
  const toggleTeam = (teamId: string) => {
    setExpandedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };
  const change = async (
    person: Person,
    action: "grant" | "revoke",
    teamId: string,
  ): Promise<boolean> => {
    if (busyRef.current || loading) return false;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<ScrutineerData>(
        `/api/elections/${election}/scrutineers`,
        {
          method: "POST",
          body: JSON.stringify({ memberId: person.id, teamId, action }),
        },
      );
      applyRoster(result);
      const name = result.teams.find((team) => team.id === teamId)?.name ?? "";
      toast({
        title:
          action === "grant"
            ? `Đã thêm ${person.full_name} vào ${name}`
            : `Đã xóa ${person.full_name} khỏi ${name}`,
      });
      void refresh().catch((error) =>
        setError(`Đã lưu phân công; chưa làm mới được trang: ${error.message}`),
      );
      return true;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể lưu phân công tổ.",
      );
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const reorderMember = async (team: Team, index: number, target: number) => {
    if (busyRef.current || loading) return;
    if (
      index < 0 ||
      target < 0 ||
      target >= team.members.length ||
      target === index
    )
      return;
    const memberIds = team.members.map((person) => person.id);
    const [memberId] = memberIds.splice(index, 1);
    memberIds.splice(target, 0, memberId);
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<ScrutineerData>(
        `/api/elections/${election}/scrutineers`,
        {
          method: "POST",
          body: JSON.stringify({
            action: "reorder",
            teamId: team.id,
            memberIds,
          }),
        },
      );
      applyRoster(result);
      toast({ title: "Đã lưu thứ tự thành viên" });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể lưu thứ tự.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const createTeam = async () => {
    if (busyRef.current || loading) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<ScrutineerData>(
        `/api/elections/${election}/scrutineers`,
        { method: "POST", body: JSON.stringify({ action: "create_team" }) },
      );
      applyRoster(result);
      if (result.createdTeamId)
        setExpandedTeamIds(
          (current) => new Set([...current, result.createdTeamId!]),
        );
      toast({ title: "Đã tạo và lưu tổ mới" });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể tạo tổ.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const addPerson = async (person: Person) => {
    if (!addTeamId || person.team_id) return;
    if (await change(person, "grant", addTeamId)) {
      setAddDialogOpen(false);
      setAddTeamId(null);
      setAddTeamName("");
      setAddSearch("");
      setAddResults([]);
    }
  };
  return (
    <div className="space-y-4" aria-label="Tổ kiểm phiếu">
      {drag &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-[100] flex cursor-grabbing items-center gap-3 rounded-md border-2 border-emerald-600 bg-white p-2 shadow-none"
            style={{
              width: drag.width,
              transform: `translate3d(${drag.left}px, ${drag.top}px, 0)`,
            }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{drag.person.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {drag.person.departments
                  ?.map((department) => department.name)
                  .join(", ") || "Chưa có ban ngành"}
                {drag.person.active_assignment ? " · Đang kiểm phiếu" : ""}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center">
              ✕
            </span>
          </div>,
          document.body,
        )}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tổ kiểm phiếu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổ chức kiểm phiếu viên thành các tổ. Mỗi tổ có thể có 3–4 thành
            viên.
          </p>
        </div>
        <DropdownMenu
          animateOnMobile
          trigger={
            <Button variant="outline" size="icon" disabled={busy || loading}>
              <MoreVertical size={20} />
            </Button>
          }
        >
          <MenuItem onSelect={() => void createTeam()}>Thêm tổ</MenuItem>
          <MenuItem
            onSelect={() => {
              const lines: string[] = [];
              if (electionName) lines.push(electionName);
              teams.forEach((t) => {
                lines.push(t.name);
                t.members.forEach((m, i) => {
                  lines.push(`${i + 1}. ${m.full_name}`);
                });
              });
              const content = lines.join("\n");
              const blob = new Blob([content], {
                type: "text/plain;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "danh-sach-to-kiem-phieu.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Xuất danh sách
          </MenuItem>
          <MenuItem
            onSelect={() => {
              const lines: string[] = [];
              if (electionName) lines.push(electionName);
              teams.forEach((t) => {
                lines.push(t.name);
                t.members.forEach((m, i) => {
                  lines.push(`${i + 1}. ${m.full_name}`);
                });
              });
              const printWindow = window.open("", "_blank");
              printWindow?.document.write(`
                <html>
                  <head>
                    <meta charset="utf-8" />
                    <title>${electionName}</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                      h1 { font-size: 24px; margin-bottom: 20px; }
                      .team { font-weight: bold; margin-top: 16px; font-size: 18px; }
                      .member { margin-left: 20px; }
                      @media print { body { padding: 0; } }
                    </style>
                  </head>
                  <body>
                    <h1 style="text-align:center">${electionName}</h1>
                    ${lines
                      .slice(electionName ? 1 : 0)
                      .map(
                        (l, i) =>
                          `<div class="${
                            teams.some((t) => t.name === l) ? "team" : "member"
                          }">${l}</div>`,
                      )
                      .join("")}
                  </body>
                </html>
              `);
              printWindow?.document.close();
              printWindow?.focus();
              printWindow?.print();
            }}
          >
            In danh sách
          </MenuItem>
        </DropdownMenu>
      </div>
      {error && (
        <div role="alert" className="space-y-2 text-destructive">
          <p>{error}</p>
          <Button
            variant="outline"
            disabled={busy || loading}
            onClick={() =>
              void load().catch((error) => setError(error.message))
            }
          >
            Tải lại phân công đã lưu
          </Button>
        </div>
      )}
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải các tổ đã lưu…
        </p>
      )}
      {data.unassigned.length > 0 && (
        <section className="space-y-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-4 text-amber-950">
          <h3 className="font-semibold">
            Chưa có phân công tổ đã lưu ({data.unassigned.length})
          </h3>
          <p className="text-sm">
            Dữ liệu cũ chỉ lưu tên, không lưu tổ. Chọn đúng tổ cho từng người;
            hệ thống không tự sắp xếp hoặc chia tổ.
          </p>
          <ul className="divide-y divide-amber-200">
            {data.unassigned.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2"
              >
                <span className="font-medium">{person.full_name}</span>
                <select
                  aria-label={`Chọn tổ cho ${person.full_name}`}
                  className="min-h-11 rounded-lg border border-amber-300 bg-white p-2 text-sm"
                  disabled={busy || loading}
                  defaultValue=""
                  onChange={(event) => {
                    const teamId = event.target.value;
                    event.target.value = "";
                    if (teamId) void change(person, "grant", teamId);
                  }}
                >
                  <option value="">Chọn tổ…</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="space-y-2">
        {teams.map((team) => (
          <section
            key={team.id}
            className="rounded-lg border-2 border-[#cfd2c9] bg-white shadow-none"
          >
            <div
              className="flex items-center justify-between gap-3 bg-muted/30 p-3 cursor-pointer"
              onClick={() => toggleTeam(team.id)}
            >
              <h3 className="font-semibold">
                {team.name} ({team.members.length})
              </h3>
              {isTeamExpanded(team.id) ? (
                <ChevronDown size={16} strokeWidth={2} />
              ) : (
                <ChevronRight size={16} strokeWidth={2} />
              )}
            </div>
            {isTeamExpanded(team.id) && (
              <div className="divide-y p-3">
                {team.members.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Chưa có thành viên trong tổ.
                  </p>
                )}
                {team.members.map((person) => (
                  <div
                    key={person.id}
                    data-reorder-team={team.id}
                    data-reorder-member={person.id}
                    className={`flex touch-none select-none items-center gap-3 rounded-md p-2 shadow-none ${busy || loading || team.members.length < 2 ? "" : "cursor-grab active:cursor-grabbing"} ${drag?.memberId === person.id ? "opacity-50" : ""} ${drag?.teamId === team.id && drag.targetId === person.id && drag.memberId !== person.id ? "bg-emerald-50 ring-2 ring-inset ring-emerald-600" : ""}`}
                    onPointerDown={(event) => {
                      if (
                        event.button !== 0 ||
                        !event.isPrimary ||
                        busyRef.current ||
                        loading ||
                        team.members.length < 2 ||
                        (event.target as HTMLElement).closest("button")
                      )
                        return;
                      event.preventDefault();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      const bounds = event.currentTarget
                        .closest<HTMLElement>("[data-reorder-member]")!
                        .getBoundingClientRect();
                      dragRef.current = {
                        left: bounds.left,
                        top: bounds.top,
                        width: bounds.width,
                        offsetX: event.clientX - bounds.left,
                        offsetY: event.clientY - bounds.top,
                        person,
                        teamId: team.id,
                        memberId: person.id,
                        targetId: person.id,
                      };
                      setDrag(dragRef.current);
                    }}
                    onPointerMove={(event) => {
                      const previous = dragRef.current;
                      if (!previous || previous.memberId !== person.id) return;
                      const current = {
                        ...previous,
                        left: event.clientX - previous.offsetX,
                        top: event.clientY - previous.offsetY,
                      };
                      dragRef.current = current;
                      setDrag(current);
                      const row = document
                        .elementFromPoint(event.clientX, event.clientY)
                        ?.closest<HTMLElement>("[data-reorder-member]");
                      if (
                        !row ||
                        row.dataset.reorderTeam !== current.teamId ||
                        !row.dataset.reorderMember
                      ) {
                        if (current.targetId !== current.memberId) {
                          dragRef.current = {
                            ...current,
                            targetId: current.memberId,
                          };
                          setDrag(dragRef.current);
                        }
                        return;
                      }
                      if (current.targetId !== row.dataset.reorderMember) {
                        dragRef.current = {
                          ...current,
                          targetId: row.dataset.reorderMember,
                        };
                        setDrag(dragRef.current);
                      }
                    }}
                    onPointerUp={(event) => {
                      const current = dragRef.current;
                      dragRef.current = null;
                      setDrag(null);
                      if (
                        event.currentTarget.hasPointerCapture(event.pointerId)
                      )
                        event.currentTarget.releasePointerCapture(
                          event.pointerId,
                        );
                      if (!current || current.teamId !== team.id) return;
                      void reorderMember(
                        team,
                        team.members.findIndex(
                          (member) => member.id === current.memberId,
                        ),
                        team.members.findIndex(
                          (member) => member.id === current.targetId,
                        ),
                      );
                    }}
                    onPointerCancel={() => {
                      dragRef.current = null;
                      setDrag(null);
                    }}
                    onLostPointerCapture={() => {
                      dragRef.current = null;
                      setDrag(null);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{person.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {person.departments?.map((d) => d.name).join(", ") ||
                          "Chưa có ban ngành"}
                        {person.active_assignment ? " · Đang kiểm phiếu" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy || person.active_assignment}
                        aria-label={`Xóa ${person.full_name} khỏi ${team.name}`}
                        onClick={() => {
                          setRemovePerson({ person, team });
                          setRemoveConfirmOpen(true);
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || loading}
                    onClick={() => {
                      setError("");
                      setAddTeamId(team.id);
                      setAddTeamName(team.name);
                      setAddSearch("");
                      setAddResults([]);
                      setAddDialogOpen(true);
                    }}
                  >
                    Thêm thành viên vào {team.name}
                  </Button>
                </div>
              </div>
            )}
          </section>
        ))}
        {teams.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">
            Chưa có tổ kiểm phiếu nào.
          </p>
        )}
      </div>
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          if (busy) return;
          setAddDialogOpen(open);
          if (!open) {
            setAddTeamId(null);
            setAddTeamName("");
            setAddSearch("");
            setAddResults([]);
          }
        }}
        title={`Thêm thành viên vào ${addTeamName}`}
        description="Tìm kiếm và chọn thành viên để thêm vào tổ kiểm phiếu"
        className="-translate-y-60"
      >
        <Input
          aria-label="Tìm kiếm thành viên"
          placeholder="Tìm kiếm tên thành viên…"
          value={addSearch}
          onChange={(e) => setAddSearch(e.target.value)}
          className="mb-4"
        />
        {error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {busy && (
          <p role="status" className="mb-3 text-sm text-muted-foreground">
            Đang lưu phân công vào cơ sở dữ liệu…
          </p>
        )}
        {addLoading && (
          <p className="text-sm text-muted-foreground mb-4">Đang tìm kiếm…</p>
        )}
        {addResults.length > 0 && (
          <div className="max-h-56 overflow-y-auto border rounded-lg transition-all duration-200 ease-in-out">
            <table className="w-full table-fixed text-left text-md transition-all duration-200 ease-in-out">
              <colgroup>
                <col className="w-[60%]" />
                <col className="w-[40%]" />
              </colgroup>
              <tbody className="transition-all duration-200 ease-in-out">
                {addResults.map((person) => (
                  <tr
                    key={person.id}
                    onClick={() => void addPerson(person)}
                    role="button"
                    tabIndex={person.team_id || busy ? -1 : 0}
                    aria-disabled={Boolean(person.team_id) || busy}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void addPerson(person);
                      }
                    }}
                    className={`border-b transition-all duration-200 ease-in-out ${person.team_id || busy ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent"}`}
                  >
                    <td className="wrap-break-word px-3 py-3 align-top font-medium">
                      {person.full_name}
                      {person.team_name && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Đã ở {person.team_name}
                        </span>
                      )}
                    </td>
                    <td className="wrap-break-word px-3 py-3 align-top text-md leading-relaxed text-muted-foreground">
                      {person.departments?.map((d) => d.name).join(", ") ||
                        "Chưa có ban ngành"}
                    </td>
                  </tr>
                ))}
                {addResults.length === 0 &&
                  addSearch.trim() !== "" &&
                  !addLoading && (
                    <tr className="transition-all duration-200 ease-in-out">
                      <td
                        colSpan={2}
                        className="px-3 py-3 text-center text-muted-foreground"
                      >
                        Không tìm thấy thành viên phù hợp.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        )}
      </Dialog>
      <Dialog
        open={removeConfirmOpen}
        onOpenChange={(open) => {
          if (busy) return;
          setRemoveConfirmOpen(open);
          if (!open) setRemovePerson(null);
        }}
        title=""
        description=""
        className="-translate-y-60"
      >
        <div className="space-y-3">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <h3 className="text-xl font-semibold">Xác nhận xóa khỏi tổ</h3>
          {removePerson && (
            <p className="text-base">
              Bạn chắc chắn muốn xóa{" "}
              <span className="font-medium">
                {removePerson.person.full_name}
              </span>{" "}
              khỏi <span className="font-medium">{removePerson.team.name}</span>
              ?
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setRemoveConfirmOpen(false)}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              if (!removePerson) return;
              if (
                await change(
                  removePerson.person,
                  "revoke",
                  removePerson.team.id,
                )
              ) {
                setRemoveConfirmOpen(false);
                setRemovePerson(null);
              }
            }}
          >
            Xóa
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
