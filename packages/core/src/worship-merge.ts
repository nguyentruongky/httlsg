/** Line changes retain their base positions so unrelated approved edits survive. */
type Edit = {
  start: number;
  end: number;
  lines: string[];
  source: "current" | "proposal";
  changeId?: number;
};
export type WorshipMergePart = {
  before: string;
  after: string;
  beforeLines: number;
  afterLines: number;
  changed: boolean;
  conflict: boolean;
  changeIds: number[];
};
function edits(base: string[], next: string[], source: Edit["source"]): Edit[] {
  // Bound memory for unusually long free-text submissions; review these as one block.
  if (base.length > 600 || next.length > 600)
    return base.join("\n") === next.join("\n")
      ? []
      : [{ start: 0, end: base.length, lines: next, source }];
  const lengths = Array.from(
    { length: base.length + 1 },
    () => new Uint16Array(next.length + 1),
  );
  for (let i = base.length - 1; i >= 0; i--)
    for (let j = next.length - 1; j >= 0; j--)
      lengths[i][j] =
        base[i] === next[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  let i = 0,
    j = 0;
  const result: Edit[] = [];
  while (i < base.length || j < next.length) {
    if (i < base.length && j < next.length && base[i] === next[j]) {
      i++;
      j++;
      continue;
    }
    const start = i,
      lines: string[] = [];
    while (i < base.length || j < next.length) {
      if (i < base.length && j < next.length && base[i] === next[j]) break;
      if (
        j < next.length &&
        (i === base.length || lengths[i][j + 1] >= lengths[i + 1][j])
      )
        lines.push(next[j++]);
      else i++;
    }
    result.push({ start, end: i, lines, source });
  }
  return result;
}
function apply(base: string[], start: number, end: number, changes: Edit[]) {
  const lines: string[] = [];
  let cursor = start;
  for (const change of changes) {
    lines.push(...base.slice(cursor, change.start), ...change.lines);
    cursor = change.end;
  }
  lines.push(...base.slice(cursor, end));
  return lines;
}
/** Three-way preview: apply only submitted differences onto the latest program. */
export function worshipMerge(
  baseText: string,
  proposedText: string,
  currentText: string,
  resolved: readonly number[] = [],
): WorshipMergePart[] {
  const base = baseText.replace(/\r\n/g, "\n").split("\n");
  const current = currentText.replace(/\r\n/g, "\n").split("\n");
  const proposal = proposedText.replace(/\r\n/g, "\n").split("\n");
  const all = [
    ...edits(base, current, "current"),
    ...edits(base, proposal, "proposal")
      .map((edit, changeId) => ({ ...edit, changeId }))
      .filter((edit) => !resolved.includes(edit.changeId)),
  ].sort((a, b) => a.start - b.start || a.end - b.end);
  const parts: WorshipMergePart[] = [];
  let cursor = 0;
  for (let i = 0; i < all.length;) {
    const group = [all[i++]];
    const start = group[0].start;
    let end = group[0].end;
    // Include overlapping edits. Insertions at a replacement boundary are
    // conservatively reviewed together rather than silently discarding either.
    while (
      i < all.length &&
      (all[i].start < end ||
        (all[i].start === end &&
          (all[i].start === all[i].end || start === end)))
    ) {
      group.push(all[i]);
      end = Math.max(end, all[i++].end);
    }
    if (start > cursor) {
      const text = base.slice(cursor, start).join("\n");
      parts.push({
        before: text,
        after: text,
        beforeLines: start - cursor,
        afterLines: start - cursor,
        changed: false,
        conflict: false,
        changeIds: [],
      });
    }
    const existing = group.filter((e) => e.source === "current");
    const submitted = group.filter((e) => e.source === "proposal");
    const beforeContent = apply(base, start, end, existing);
    const afterContent = submitted.length
      ? apply(base, start, end, submitted)
      : beforeContent;
    const before = beforeContent.join("\n");
    const after = afterContent.join("\n");
    const different =
      before !== after || beforeContent.length !== afterContent.length;
    parts.push({
      before,
      after,
      beforeLines: beforeContent.length,
      afterLines: afterContent.length,
      changed: submitted.length > 0,
      changeIds: submitted.map((edit) => edit.changeId!),
      conflict: submitted.length > 0 && existing.length > 0 && different,
    });
    cursor = end;
  }
  if (cursor < base.length) {
    const text = base.slice(cursor).join("\n");
    parts.push({
      before: text,
      after: text,
      beforeLines: base.length - cursor,
      afterLines: base.length - cursor,
      changed: false,
      conflict: false,
      changeIds: [],
    });
  }
  return parts;
}

export type WorshipReviewDecision = {
  scope?: "submission";
  id: string;
  action: "approve-change" | "discard-change" | "reject";
  eventId: string | null;
  version: number | null;
  changeIds?: number[];
  changeText?: string;
};
/** One local decision; used by the browser preview and the final transaction. */
export function applyWorshipReviewDecision(
  draft: {
    base_text: string;
    proposed_text: string;
    change_reviews: { changeIds: number[]; action: string }[];
  },
  currentText: string,
  decision: WorshipReviewDecision,
) {
  const resolved = draft.change_reviews.flatMap((review) => review.changeIds);
  const parts = worshipMerge(
    draft.base_text,
    draft.proposed_text,
    currentText,
    resolved,
  );
  if (decision.action === "reject")
    return {
      text: currentText,
      changeIds: parts.flatMap((part) => part.changeIds),
      remaining: false,
    };
  if (decision.scope === "submission") {
    const changeIds = parts.flatMap((part) => part.changeIds);
    if (
      !changeIds.length ||
      JSON.stringify(changeIds) !== JSON.stringify(decision.changeIds)
    )
      throw new Error(
        "Bản nháp đã thay đổi. Vui lòng tải lại trước khi duyệt.",
      );
    const merged = parts
      .flatMap((part) => (part.afterLines ? part.after.split("\n") : []))
      .join("\n");
    return {
      text:
        decision.action === "discard-change"
          ? currentText
          : (decision.changeText ?? merged),
      changeIds,
      remaining: false,
    };
  }
  const selected = parts.find(
    (part) =>
      part.changed &&
      JSON.stringify(part.changeIds) === JSON.stringify(decision.changeIds),
  );
  if (!selected)
    throw new Error(
      "Thay đổi đã được xử lý hoặc đã thay đổi. Vui lòng tải lại.",
    );
  const text =
    decision.action === "discard-change"
      ? currentText
      : parts
          .flatMap((part) => {
            if (part === selected) {
              const value = decision.changeText ?? part.after;
              return value === "" ? [] : value.split("\n");
            }
            return part.beforeLines ? part.before.split("\n") : [];
          })
          .join("\n");
  return {
    text,
    changeIds: selected.changeIds,
    remaining: parts.some((part) => part.changed && part !== selected),
  };
}
