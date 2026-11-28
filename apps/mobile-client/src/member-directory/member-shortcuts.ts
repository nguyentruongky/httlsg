export type MemberShortcutScope = boolean | "board";
export type MemberShortcuts = { pinned: string[]; recent: string[] };
const changed = "church:member-shortcuts";
const memory = new Map<string, string>();

export function memberShortcutKey(
  org: string,
  actorId: string,
  team: MemberShortcutScope,
) {
  return `church:member-shortcuts:${JSON.stringify([org, actorId, team === "board" ? "board" : team ? "leader" : "directory"])}`;
}

export function readShortcutSnapshot(key: string | null): string | null {
  if (!key) return null;
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function parseMemberShortcuts(raw: string | null): MemberShortcuts {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return { pinned: [], recent: [] };
    const ids = (input: unknown) =>
      Array.isArray(input)
        ? [
            ...new Set(
              input.filter(
                (id): id is string =>
                  typeof id === "string" && id.length > 0 && id.length <= 200,
              ),
            ),
          ].slice(0, 20)
        : [];
    const record = value as Record<string, unknown>;
    return { pinned: ids(record.pinned), recent: ids(record.recent) };
  } catch {
    return { pinned: [], recent: [] };
  }
}

export function subscribeMemberShortcuts(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key);
    else memory.clear();
    listener();
  };
  window.addEventListener(changed, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changed, listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(
  key: string,
  transform: (current: MemberShortcuts) => MemberShortcuts,
) {
  const raw = JSON.stringify(
    transform(parseMemberShortcuts(readShortcutSnapshot(key))),
  );
  memory.set(key, raw);
  try {
    localStorage.setItem(key, raw);
  } catch {
    /* Keep this session usable when storage is unavailable. */
  }
  window.dispatchEvent(new Event(changed));
}

export function recordMemberView(key: string, id: string) {
  const current = parseMemberShortcuts(readShortcutSnapshot(key));
  if (current.recent[0] === id) return;
  update(key, (value) => ({
    ...value,
    recent: [id, ...value.recent.filter((item) => item !== id)].slice(0, 20),
  }));
}

export function togglePinnedMember(key: string, id: string) {
  update(key, (value) => ({
    ...value,
    pinned: value.pinned.includes(id)
      ? value.pinned.filter((item) => item !== id)
      : [id, ...value.pinned].slice(0, 20),
  }));
}
