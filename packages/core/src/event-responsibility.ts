import { normalizeWorshipWorkerText } from "./worship-workers";

export type EventResponsiblePerson = {
  id: string;
  name: string;
  hasAccount: boolean;
  pushEnabled: boolean;
};
export type EventResponsibilityMatch = {
  role: string;
  text: string;
  start: number;
  end: number;
  person: EventResponsiblePerson | null;
  candidates: EventResponsiblePerson[];
};
const normalize = (value: string) =>
  value
    .replace(/^@/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(
      /^(?:(?:ms|msts|msnc|cs|td|muc su|chap su|truyen dao|anh|chi|ong|ba)\.?\s+)+/,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
const roles = new Map([
  ["hdct", "HDCT"],
  ["hat dan", "Hát dẫn"],
  ["ban hat le", "Ban hát lễ"],
]);
/** Resolve people only from the three supported responsibility lines. */
export function matchEventResponsibilities(
  text: string,
  people: EventResponsiblePerson[],
): EventResponsibilityMatch[] {
  const result: EventResponsibilityMatch[] = [];
  const append = (role: string, entered: string, start: number) => {
    const key = normalize(entered);
    if (!key || /^(?:[.\s…_\-–—]+|chua (?:co|phan cong))$/i.test(key)) return;
    const exact = people.filter((p) => normalize(p.name) === key);
    const candidates = exact.length
      ? exact
      : key.split(" ").length >= 2
        ? people.filter((p) => normalize(p.name).endsWith(" " + key))
        : [];
    result.push({
      role,
      text: entered,
      start,
      end: start + entered.length,
      person: candidates.length === 1 ? candidates[0] : null,
      candidates,
    });
  };
  let offset = 0;
  for (const line of text.split(/\n/)) {
    const field = /^\s*(?:[-–—•*]\s*)?([^:：]+)[:：](.*)$/.exec(line);
    const knownRole = field
      ? roles.get(normalizeWorshipWorkerText(field[1]))
      : undefined;
    if (knownRole && /(?:^|\s)@/.test(field![2])) {
      for (const mention of line.matchAll(/@([^@\r\n,;]+)/g)) {
        const entered = mention[0].trim();
        append(knownRole, entered, offset + mention.index!);
      }
    } else if (field && knownRole) {
      const valueStart = line.indexOf(
        field[2],
        line.indexOf(field[1]) + field[1].length + 1,
      );
      const separated = field[2].replace(/\s+và\s+/giu, (separator) =>
        ";".repeat(separator.length),
      );
      for (const token of separated.matchAll(/[^,;\/&+\r]+/g)) {
        const entered = token[0].trim();
        if (entered)
          append(
            knownRole,
            entered,
            offset + valueStart + token.index! + token[0].indexOf(entered),
          );
      }
    }
    offset += line.length + 1;
  }
  return result;
}
