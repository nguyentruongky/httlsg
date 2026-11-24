import {
  electionSearch,
  matchesElectionName,
  type ElectionCandidate,
  type ElectionTicketKind,
} from "@org/core";

export function entryFilter(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  const commandIndex = tokens.findIndex((token) => token.startsWith("-"));
  return tokens
    .slice(0, commandIndex < 0 ? tokens.length : commandIndex)
    .join(" ");
}
export function filterEntryCandidates(
  candidates: ElectionCandidate[],
  search: string,
) {
  const tokens = electionSearch(search).split(" ").filter(Boolean);
  return candidates.filter((candidate) =>
    tokens.every((token) =>
      /^\d+$/.test(token)
        ? candidate.candidate_no === Number(token)
        : matchesElectionName(candidate.name_search, token),
    ),
  );
}

type CommandPlan =
  | {
      ok: true;
      search: string;
      selected: number[];
      submit: boolean;
      kind: ElectionTicketKind;
      selectionCommand: boolean;
    }
  | { ok: false; message: string };
/** Validate the whole command before changing selections or saving any ballot. */
export function planEntryCommand(
  value: string,
  previousSearch: string,
  candidates: ElectionCandidate[],
  selected: number[],
): CommandPlan {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  const commandIndex = tokens.findIndex((token) => token.startsWith("-"));
  const prefix = entryFilter(value);
  const search = prefix || (commandIndex >= 0 ? previousSearch : "");
  const commands = commandIndex < 0 ? [] : tokens.slice(commandIndex);
  const found = filterEntryCandidates(candidates, search);
  if (commands.length === 0 && prefix && found.length === 1) {
    commands.push("-1");
  }
  const special = commands.find(
    (command) => command === "-pt" || command === "-bhl",
  );
  if (special && commands.length !== 1)
    return {
      ok: false,
      message: "Dùng riêng lệnh -pt hoặc -bhl để nộp phiếu.",
    };
  let next = [...selected];
  let submit = false;
  for (const [index, command] of commands.entries()) {
    if (command === "-s") {
      if (index !== commands.length - 1)
        return { ok: false, message: "Lệnh -s phải ở cuối để lưu phiếu." };
      submit = true;
    } else if (command === "-pt" || command === "-bhl") {
      next = [];
      submit = true;
    } else if (/^-[1-9]\d*$/.test(command)) {
      const candidate = found[Number(command.slice(1)) - 1];
      if (!candidate)
        return {
          ok: false,
          message: `Vị trí ${command.slice(1)} không có trong ${found.length} kết quả đang lọc.`,
        };
      next = next.includes(candidate.id)
        ? next.filter((id) => id !== candidate.id)
        : [...next, candidate.id];
    } else
      return {
        ok: false,
        message: `Lệnh không hợp lệ: ${command}. Dùng -<vị trí>, -pt, -bhl hoặc -s.`,
      };
  }
  return {
    ok: true,
    search,
    selected: next,
    submit,
    kind:
      special === "-pt" ? "blank" : special === "-bhl" ? "invalid" : "normal",
    selectionCommand: commands.some((command) => /^-[1-9]\d*$/.test(command)),
  };
}
