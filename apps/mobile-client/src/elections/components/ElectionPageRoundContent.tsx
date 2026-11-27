import { RoundSelector } from "./round-selector";
import { TicketEntryForm } from "./ticket-entry-form";
import { ScrutineerAssignment } from "./scrutineer-assignment";
import { TicketsList } from "./tickets-list";
import { ResultsTable } from "./results-table";

interface ElectionPageRoundContentProps {
  roundData: any;
  detail: any;
  tab: string;
  setTab: (tab: string) => void;
  roundManagement: any;
  resultsView: any;
  ticketEntry: any;
  admin: boolean;
  roundId: number;
  handleRoundChange: (id: number) => void;
  electionPhaseFromRound: (round: any) => string;
}

export function ElectionPageRoundContent({
  roundId,
  handleRoundChange,
  roundData,
  detail,
  tab,
  setTab,
  roundManagement,
  resultsView,
  ticketEntry,
  admin,
  electionPhaseFromRound,
}: ElectionPageRoundContentProps) {
  const phase = roundData ? electionPhaseFromRound(roundData) : "draft";

  const showScrutineerAssignment = detail && admin;
  const showRoundData = roundData;
  const isEntryTab = tab === "entry";
  const isManageTab = tab === "manage";
  const isResultsTab = tab === "results";
  const isTicketsTab = tab === "tickets";
  const isAuditTab = tab === "audit";

  function renderEntryContent() {
    if (!isEntryTab || !showRoundData) return null;
    return (
      <TicketEntryForm
        candidates={detail.candidates}
        selectedIds={ticketEntry.selected}
        onToggle={ticketEntry.toggle}
        onSubmit={ticketEntry.save}
        onClear={() => {}}
        saving={ticketEntry.saving}
        ready={ticketEntry.ready}
        hint={ticketEntry.hint}
      />
    );
  }

  function renderManageContent() {
    if (!isManageTab || !showRoundData) return null;
    return (
      <div className="space-y-4">
        <RoundSelector
          rounds={detail.rounds}
          currentRoundId={roundId}
          onChange={handleRoundChange}
        />
        {roundData?.status === "draft" && (
          <div className="space-y-4">
            <ScrutineerAssignment
              scrutineers={detail.scrutineers}
              assignedIds={roundManagement.users}
              onToggle={roundManagement.setUsers}
              candidates={detail.candidates}
              selectedCandidateIds={roundManagement.selected}
              onCandidateToggle={roundManagement.setSelected}
              onSave={roundManagement.handleConfigure}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8] h-10 px-4 rounded-xl text-sm font-medium"
                onClick={roundManagement.handleConfigure}
              >
                Lưu phân công và ứng viên
              </button>
              <button
                className="bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d] h-10 px-4 rounded-xl text-sm font-medium"
                onClick={() => roundManagement.change("start", "online")}
              >
                Nhận phiếu trực tuyến
              </button>
              <button
                className="border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8] h-10 px-4 rounded-xl text-sm font-medium"
                onClick={() => roundManagement.change("start", "checking")}
              >
                Kiểm phiếu thủ công
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStatusContent() {
    if (!showRoundData) return null;
    return (
      <>
        {roundData?.status === "open" && (
          <button onClick={() => roundManagement.change("manual-checking")}>
            Chuyển sang kiểm phiếu thủ công
          </button>
        )}
        {roundData?.status === "checking" && (
          <button
            className="bg-red-600 text-white hover:bg-red-700 h-10 px-4 rounded-xl text-sm font-medium"
            onClick={() => roundManagement.change("stop")}
          >
            Đóng bầu cử
          </button>
        )}
        {roundData?.status === "closed" && (
          <div>
            <button
              className="border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8] h-10 px-4 rounded-xl text-sm font-medium"
              onClick={() => roundManagement.change("reopen")}
            >
              Mở lại (cần lý do)
            </button>
          </div>
        )}
      </>
    );
  }

  function renderResultsContent() {
    if (!isResultsTab || !showRoundData) return null;
    return (
      <div className="space-y-4">
        <ResultsTable
          results={resultsView.rows}
          sortBy={resultsView.sort}
          onSortChange={resultsView.setSort}
          searchQuery={resultsView.search}
          onSearchChange={resultsView.setSearch}
        />
      </div>
    );
  }

  function renderTicketsContent() {
    if (!isTicketsTab || !showRoundData) return null;
    return (
      <TicketsList
        tickets={ticketEntry.ticketsQuery.data?.items ?? []}
        admin={admin}
        onAction={ticketEntry.voidTicket}
      />
    );
  }

  return (
    <div>
      <nav className="flex flex-wrap gap-2" aria-label="Quản trị">
        {["manage", "results", "audit"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-10 px-4 rounded-xl text-sm font-medium ${
              tab === t
                ? "bg-[#215e3d] text-white"
                : "border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8]"
            }`}
          >
            {
              {
                manage: "Quản lý bầu cử",
                results: "Kết quả",
                audit: "Nhật ký",
              }[t]
            }
          </button>
        ))}
      </nav>

      {renderEntryContent()}
      {renderManageContent()}
      {renderStatusContent()}
      {renderResultsContent()}
      {renderTicketsContent()}
    </div>
  );
}
