import { worshipFieldForLabel } from "./parser";
import { WORSHIP_FIELD_LABELS } from "./types";
export interface HymnOccurrence {
  lineNumber: number;
  section: string;
}
export interface DuplicateWorshipHymn {
  hymn: string;
  occurrences: HymnOccurrence[];
}
/** Advisory only: explicit TC references, not verse numbers, dates or Bible passages. */
export function findDuplicateWorshipHymns(
  text: string,
): DuplicateWorshipHymn[] {
  const hymns = new Map<string, HymnOccurrence[]>();
  let section = "Nội dung";
  const lines = text.normalize("NFC").split(/\r\n|\n|\r/);
  lines.forEach((line, index) => {
    const label = /^\s*([^:：]+?)\s*[:：]/.exec(line);
    if (label) {
      const field = worshipFieldForLabel(label[1]);
      section = field ? WORSHIP_FIELD_LABELS[field] : label[1].trim();
    }
    for (const match of line.matchAll(
      /(?:^|[^\p{L}\p{N}])TC\s*(\d+)(?![\p{L}\p{N}])/giu,
    )) {
      const number = match[1].replace(/^0+(?=\d)/, "");
      const hymn = "TC " + number;
      const occurrences = hymns.get(hymn) ?? [];
      occurrences.push({ lineNumber: index + 1, section });
      hymns.set(hymn, occurrences);
    }
  });
  return [...hymns]
    .filter(([, occurrences]) => occurrences.length > 1)
    .map(([hymn, occurrences]) => ({ hymn, occurrences }));
}
