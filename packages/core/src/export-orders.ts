export interface ExportHeadingRange {
  start: number;
  end: number;
}
export interface ExportDraft {
  text: string;
  headingRanges: ExportHeadingRange[];
}
/** Track original event headings through a textarea edit; never guess from song/list numbering. */
export function updateExportEventOrders(
  previous: ExportDraft,
  next: string,
  selectionStart = next.length,
  selectionEnd = selectionStart,
) {
  let prefix = 0;
  while (
    prefix < previous.text.length &&
    prefix < next.length &&
    previous.text[prefix] === next[prefix]
  )
    prefix++;
  let suffix = 0;
  while (
    suffix < previous.text.length - prefix &&
    suffix < next.length - prefix &&
    previous.text[previous.text.length - 1 - suffix] ===
      next[next.length - 1 - suffix]
  )
    suffix++;
  const oldEnd = previous.text.length - suffix;
  const delta = next.length - previous.text.length;
  const starts = new Set<number>();
  for (const heading of previous.headingRanges) {
    if (prefix < oldEnd && prefix <= heading.start && oldEnd >= heading.end)
      continue;
    let anchor = heading.start;
    if (heading.start >= oldEnd) anchor += delta;
    else if (heading.start >= prefix) anchor = prefix;
    anchor = Math.max(0, Math.min(next.length, anchor));
    const lineStart = anchor === 0 ? 0 : next.lastIndexOf("\n", anchor - 1) + 1;
    if (/^\d+\.[ \t]+/.test(next.slice(lineStart))) starts.add(lineStart);
  }
  let text = "",
    cursor = 0;
  const headingRanges: ExportHeadingRange[] = [];
  const changes: { start: number; oldLength: number; newLength: number }[] = [];
  for (const start of [...starts].sort((a, b) => a - b)) {
    const end =
      next.indexOf("\n", start) < 0 ? next.length : next.indexOf("\n", start);
    const heading = next.slice(start, end);
    const number = /^\d+/.exec(heading)![0];
    const order = String(headingRanges.length + 1);
    text += next.slice(cursor, start);
    const newStart = text.length;
    text += order + heading.slice(number.length);
    headingRanges.push({ start: newStart, end: text.length });
    changes.push({ start, oldLength: number.length, newLength: order.length });
    cursor = end;
  }
  text += next.slice(cursor);
  function mapSelection(position: number) {
    let shift = 0;
    for (const change of changes) {
      if (position >= change.start + change.oldLength)
        shift += change.newLength - change.oldLength;
      else if (position > change.start)
        return (
          change.start +
          shift +
          Math.min(position - change.start, change.newLength)
        );
    }
    return position + shift;
  }
  return {
    text,
    headingRanges,
    selectionStart: mapSelection(selectionStart),
    selectionEnd: mapSelection(selectionEnd),
  };
}
