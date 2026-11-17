import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMemberReads } from "@org/core";
import { Dialog } from "@org/ui";
import { HistoryEntryForm as EntryForm } from "./history-entry-form";
export function MemberNoteDialog({
  org,
  memberId,
  name,
  onClose,
}: {
  org: string;
  memberId: string;
  name: string;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
      title="Thêm ghi chú"
      description={name}
      closeLabel="Đóng ghi chú"
      bottomSheet={mobile}
      className="member-note-sheet"
      onOpenAutoFocus={(event) => {
        const content = event.target;
        if (!(content instanceof HTMLElement)) return;
        const input = content.querySelector<HTMLTextAreaElement>("textarea");
        if (!input) return;
        event.preventDefault();
        input.focus({ preventScroll: true });
      }}
    >
      <EntryForm
        kind="notes"
        inDialog
        org={org}
        memberId={memberId}
        onClose={onClose}
        onSavingChange={setSaving}
        onUpdated={() => invalidateMemberReads(client, org)}
      />
    </Dialog>
  );
}
