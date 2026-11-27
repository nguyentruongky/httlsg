import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ElectionTicket } from "../domain/types";

/**
 * Zustand store for client/UI state ONLY
 * NEVER store server data here - TanStack Query owns server cache
 * Only UI/transient state: selected candidates, active tabs, search filters, dialogs, PIN progress
 */

export interface ElectionUIState {
  // Candidate selection for ticket entry
  selectedCandidateIds: number[];
  setSelectedCandidateIds: (ids: number[]) => void;
  toggleCandidate: (id: number) => void;
  clearSelectedCandidates: () => void;

  // Active tabs
  activeElectionTab: "entry" | "tickets" | "manage" | "results" | "audit";
  setActiveElectionTab: (
    tab: "entry" | "tickets" | "manage" | "results" | "audit",
  ) => void;

  // Search/filter state
  candidateSearchQuery: string;
  setCandidateSearchQuery: (query: string) => void;
  ticketSearchQuery: string;
  setTicketSearchQuery: (query: string) => void;
  ticketTeamFilter: string;
  setTicketTeamFilter: (team: string) => void;
  resultSearchQuery: string;
  setResultSearchQuery: (query: string) => void;
  resultSortBy: "votes" | "name" | "number";
  setResultSortBy: (sort: "votes" | "name" | "number") => void;
  resultTopN: number;
  setResultTopN: (n: number) => void;

  // Dialog/confirmation state
  showEndConfirmation: boolean;
  setShowEndConfirmation: (show: boolean) => void;
  showReopenConfirmation: boolean;
  setShowReopenConfirmation: (show: boolean) => void;
  reopenReason: string;
  setReopenReason: (reason: string) => void;

  // Countdown/start election
  countdown: {
    open: boolean;
    action: "start-online" | "start-checking" | "manual-checking" | null;
    seconds: number;
  };
  setCountdown: (countdown: {
    open: boolean;
    action: "start-online" | "start-checking" | "manual-checking" | null;
    seconds: number;
  }) => void;
  cancelCountdown: () => void;

  // PIN/verification progress (public election)
  pinProgress: {
    step: "idle" | "verifying" | "submitting" | "done" | "error";
    attempt: { distance: number; accuracy: number } | null;
  };
  setPinProgress: (progress: {
    step: "idle" | "verifying" | "submitting" | "done" | "error";
    attempt: { distance: number; accuracy: number } | null;
  }) => void;

  // Manual ticket entry
  manualTicketSearch: string;
  setManualTicketSearch: (query: string) => void;
  manualTicketTab: "candidates" | "selected";
  setManualTicketTab: (tab: "candidates" | "selected") => void;

  // Scrutineer page
  scrutineerTab: "entry" | "tickets";
  setScrutineerTab: (tab: "entry" | "tickets") => void;
  scrutineerRoundId: number;
  setScrutineerRoundId: (id: number) => void;
  scrutineerElectionId: string;
  setScrutineerElectionId: (id: string) => void;

  // Admin page
  adminSelectedElection: number;
  setAdminSelectedElection: (id: number) => void;
  adminRoundId: number;
  setAdminRoundId: (id: number) => void;
  adminTab: "manage" | "results" | "audit";
  setAdminTab: (tab: "manage" | "results" | "audit") => void;

  // Confirmation dialogs
  confirmEnd: boolean;
  setConfirmEnd: (show: boolean) => void;
  closeError: string;
  setCloseError: (error: string) => void;

  // Scrutineer assignment
  assignedScrutineerIds: string[];
  setAssignedScrutineerIds: (ids: string[]) => void;
  selectedCandidateIdsForAssignment: number[];
  setSelectedCandidateIdsForAssignment: (ids: number[]) => void;

  // Round management
  roundManagementRule: "top" | "minimum" | "manual";
  setRoundManagementRule: (rule: "top" | "minimum" | "manual") => void;
  roundManagementValue: number;
  setRoundManagementValue: (value: number) => void;
  roundManagementPreview: any;
  setRoundManagementPreview: (preview: any) => void;
  roundManagementCarry: number[];
  setRoundManagementCarry: (carry: number[]) => void;

  // PIN verification
  connectionApproved: boolean;
  setConnectionApproved: (approved: boolean) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  offline: boolean;
  setOffline: (offline: boolean) => void;
  networkError: string;
  setNetworkError: (error: string) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  attempt: { distance: number; accuracy: number } | null;
  setAttempt: (attempt: { distance: number; accuracy: number } | null) => void;
}

export const useElectionUIStore = create<ElectionUIState>()(
  persist(
    (set) => ({
      // Candidate selection
      selectedCandidateIds: [],
      setSelectedCandidateIds: (ids) => set({ selectedCandidateIds: ids }),
      toggleCandidate: (id) =>
        set((state) => ({
          selectedCandidateIds: state.selectedCandidateIds.includes(id)
            ? state.selectedCandidateIds.filter((v) => v !== id)
            : state.selectedCandidateIds.length >= 10
              ? state.selectedCandidateIds
              : [...state.selectedCandidateIds, id],
        })),
      clearSelectedCandidates: () => set({ selectedCandidateIds: [] }),

      // Active tabs
      activeElectionTab: "entry",
      setActiveElectionTab: (tab) => set({ activeElectionTab: tab }),

      // Search/filter
      candidateSearchQuery: "",
      setCandidateSearchQuery: (query) => set({ candidateSearchQuery: query }),
      ticketSearchQuery: "",
      setTicketSearchQuery: (query) => set({ ticketSearchQuery: query }),
      ticketTeamFilter: "all",
      setTicketTeamFilter: (team) => set({ ticketTeamFilter: team }),
      resultSearchQuery: "",
      setResultSearchQuery: (query) => set({ resultSearchQuery: query }),
      resultSortBy: "votes",
      setResultSortBy: (sort) => set({ resultSortBy: sort }),
      resultTopN: 10,
      setResultTopN: (n) => set({ resultTopN: n }),

      // Dialog/confirmation
      showEndConfirmation: false,
      setShowEndConfirmation: (show) => set({ showEndConfirmation: show }),
      showReopenConfirmation: false,
      setShowReopenConfirmation: (show) =>
        set({ showReopenConfirmation: show }),
      reopenReason: "",
      setReopenReason: (reason) => set({ reopenReason: reason }),

      // Countdown
      countdown: { open: false, action: null, seconds: 3 },
      setCountdown: (countdown) => set({ countdown }),
      cancelCountdown: () =>
        set({ countdown: { open: false, action: null, seconds: 3 } }),

      // PIN progress
      pinProgress: { step: "idle", attempt: null },
      setPinProgress: (progress) => set({ pinProgress: progress }),

      // Manual ticket entry
      manualTicketSearch: "",
      setManualTicketSearch: (query) => set({ manualTicketSearch: query }),
      manualTicketTab: "candidates",
      setManualTicketTab: (tab) => set({ manualTicketTab: tab }),

      // Scrutineer page
      scrutineerTab: "entry",
      setScrutineerTab: (tab) => set({ scrutineerTab: tab }),
      scrutineerRoundId: 0,
      setScrutineerRoundId: (id) => set({ scrutineerRoundId: id }),
      scrutineerElectionId: "",
      setScrutineerElectionId: (id) => set({ scrutineerElectionId: id }),

      // Admin page
      adminSelectedElection: 0,
      setAdminSelectedElection: (id) => set({ adminSelectedElection: id }),
      adminRoundId: 0,
      setAdminRoundId: (id) => set({ adminRoundId: id }),
      adminTab: "manage",
      setAdminTab: (tab) => set({ adminTab: tab }),

      // Confirmation dialogs
      confirmEnd: false,
      setConfirmEnd: (show) => set({ confirmEnd: show }),
      closeError: "",
      setCloseError: (error) => set({ closeError: error }),

      // Scrutineer assignment
      assignedScrutineerIds: [],
      setAssignedScrutineerIds: (ids) => set({ assignedScrutineerIds: ids }),
      selectedCandidateIdsForAssignment: [],
      setSelectedCandidateIdsForAssignment: (ids) =>
        set({ selectedCandidateIdsForAssignment: ids }),

      // Round management
      roundManagementRule: "top",
      setRoundManagementRule: (rule) => set({ roundManagementRule: rule }),
      roundManagementValue: 10,
      setRoundManagementValue: (value) => set({ roundManagementValue: value }),
      roundManagementPreview: null,
      setRoundManagementPreview: (preview) =>
        set({ roundManagementPreview: preview }),
      roundManagementCarry: [],
      setRoundManagementCarry: (carry) => set({ roundManagementCarry: carry }),

      // PIN verification
      connectionApproved: false,
      setConnectionApproved: (approved) =>
        set({ connectionApproved: approved }),
      loading: false,
      setLoading: (loading) => set({ loading }),
      offline: false,
      setOffline: (offline) => set({ offline }),
      networkError: "",
      setNetworkError: (error) => set({ networkError: error }),
      busy: false,
      setBusy: (busy) => set({ busy }),
      attempt: null,
      setAttempt: (attempt) => set({ attempt }),
    }),
    {
      name: "election-ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist truly user-preference state, not transient UI state
        activeElectionTab: state.activeElectionTab,
        resultSortBy: state.resultSortBy,
        resultTopN: state.resultTopN,
        manualTicketTab: state.manualTicketTab,
        scrutineerTab: state.scrutineerTab,
        adminTab: state.adminTab,
      }),
    },
  ),
);
