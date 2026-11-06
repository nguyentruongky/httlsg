import {
  WORSHIP_FIELD_LABELS,
  type WorshipProgramFields,
  type WorshipFieldKey,
} from "./types";
const normalize = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
const keys = Object.keys(WORSHIP_FIELD_LABELS) as WorshipFieldKey[];
const labelMap = new Map(
  keys.map((key) => [normalize(WORSHIP_FIELD_LABELS[key]), key]),
);
// Alternate labels map to the same field; repeated aliases retain all values.
for (const [label, key] of [
  ["NKTP", "songs"],
  ["Chấp sự HDCT", "host"],
  ["KTĐĐ (Kinh Thánh Đối Đáp)", "responsiveReading"],
  ["Kinh Thánh Đối Đáp", "responsiveReading"],
] as const) {
  labelMap.set(normalize(label), key);
}
/** Extract values without modifying the source. Repeated fields retain all values. */
export function parseWorshipProgram(text: string): WorshipProgramFields {
  const parts = Object.fromEntries(
    keys.map((key) => [key, [] as string[]]),
  ) as Record<WorshipFieldKey, string[]>;
  let current: WorshipFieldKey | undefined;
  for (const line of text.split(/\r\n|\n|\r/)) {
    const match = /^\s*([^:：]+?)\s*[:：](.*)$/.exec(line);
    const key = match ? labelMap.get(normalize(match[1])) : undefined;
    if (key) {
      current = key;
      parts[key].push(match![2]);
    } else if (current) parts[current].push(line);
  }
  return Object.fromEntries(
    keys.map((key) => [key, parts[key].join("\n").trim()]),
  ) as WorshipProgramFields;
}
export function isWorshipProgramText(text: string) {
  const first = text
    .trimStart()
    .split(/\r\n|\n|\r/)[0]
    .normalize("NFC");
  return (
    /^LỊCH\s+TRỰC\s+NGÀY\s+.+[–—-]\s*LỄ(?:\s|$)/iu.test(first) &&
    text.split(/\r\n|\n|\r/).filter((line) => {
      const match = /^\s*([^:：]+?)\s*[:：]/.exec(line);
      return match && labelMap.has(normalize(match[1]));
    }).length >= 2
  );
}
