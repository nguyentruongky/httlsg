import { ticketStatusLabel } from "../ticket-status-label";
import type { ElectionTicketKind } from "@org/core";
import { useMemo, useRef, useState } from "react";
import {
  entryFilter,
  filterEntryCandidates,
  planEntryCommand,
} from "./entry-command";
import { useToast } from "@org/ui";
import { saveLocalTicket, syncElectionTickets } from "../local-election";
import { useRoundSession } from "./use-round-session";
import type { EntryProps } from "./entry-types";
export type { EntryProps } from "./entry-types";
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Không thể xử lý yêu cầu.";
export function useTicketEntry(props: EntryProps) {
  const { user, run } = props;
  const {
    round,
    candidates,
    hint,
    setHint,
    pending,
    setPending,
    ready,
    next,
    setNext,
    audit,
  } = useRoundSession(props);
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [scrollResetKey, setScrollResetKey] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const commandRef = useRef(false);
  const found = useMemo(
    () => filterEntryCandidates(candidates, search),
    [candidates, search],
  );

  const focus = () =>
    setTimeout(() => input.current?.focus({ preventScroll: true }), 0);

  const toggle = async (id: number) => {
    if (
      savingRef.current ||
      commandRef.current ||
      !ready ||
      round.status !== "open"
    )
      return;
    const exists = selected.includes(id);
    await audit(exists ? "candidate_deselected" : "candidate_selected", {
      candidate_id: id,
    });
    setSelected((old) =>
      old.includes(id) ? old.filter((v) => v !== id) : [...old, id],
    );
    setQuery("");
    setSearch("");
    setHint("");
    focus();
  };

  const submit = async (
    kind: ElectionTicketKind = "normal",
    selection = selected,
  ) => {
    if (
      savingRef.current ||
      !ready ||
      !round.assignment ||
      round.status !== "open"
    )
      return;
    if (kind === "normal" && !selection.length) {
      setHint("Dùng -pt để nộp phiếu trắng hoặc -bhl để nộp phiếu bất hợp lệ.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const ticket = await saveLocalTicket(
        user.id,
        round,
        kind === "normal" ? selection : [],
        kind,
      );
      setSelected([]);
      setQuery("");
      setSearch("");
      setPending((v) => v + 1);
      setNext(ticket.seq_no + 1);
      toast({
        title: `Phiếu ${ticket.team_ticket_no ?? ticket.seq_no} · ${ticketStatusLabel(ticket)}`,
        description: "Đã lưu trên thiết bị. Đang chờ đồng bộ.",
      });
      void syncElectionTickets(user.id).catch((e) => setHint(errorMessage(e)));
    } finally {
      savingRef.current = false;
      setSaving(false);
      focus();
    }
  };

  const command = async () => {
    if (
      commandRef.current ||
      savingRef.current ||
      !ready ||
      round.status !== "open"
    )
      return;
    commandRef.current = true;
    try {
      const plan = planEntryCommand(query, search, candidates, selected);
      if (!plan.ok) {
        setHint(plan.message);
        await audit("command_rejected", { command: query });
        return;
      }
      await audit("command_executed", {
        command: query,
        search: plan.search,
        candidate_ids: plan.selected,
        entry_kind: plan.kind,
      });
      if (plan.kind === "normal") setSelected(plan.selected);
      setHint("");
      // Submit the computed selection directly, without waiting for React state.
      if (plan.submit) await submit(plan.kind, plan.selected);
    } finally {
      setQuery("");
      setSearch("");
      setScrollResetKey((value) => value + 1);
      commandRef.current = false;
      focus();
    }
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    const prefix = entryFilter(value);
    if (prefix || !value.trim().startsWith("-")) {
      if (prefix !== search) setScrollResetKey((value) => value + 1);
      setSearch(prefix);
      void run(() => audit("search", { query: prefix }));
    }
  };
  return {
    round,
    candidates,
    found,
    scrollResetKey,
    query,
    changeQuery,
    selected,
    hint,
    pending,
    saving,
    ready,
    next,
    input,
    focus,
    toggle: (id: number) => void run(() => toggle(id)),
    command: () => void run(command),
    save: () => void run(() => submit()),
    requestBlank: () => void run(() => submit("blank", [])),
    requestInvalid: () => void run(() => submit("invalid", [])),
  };
}
