import { z } from "zod";
import { ScheduleDraft } from "./schedules";
const PREFIX = "church.reception-draft.v1:";
export const LocalScheduleDraftSchema = z
  .object({
    ownerId: z.uuid(),
    authVersion: z.number().int().min(0),
    scope: z.string().regex(/^(new|record):[0-9a-f-]{36}$/i),
    baseVersion: z.number().int().nullable(),
    recordId: z.uuid().nullable(),
    requestId: z.uuid(),
    draft: ScheduleDraft.refine((draft) => draft.categoryId === "reception"),
    names: z.record(z.string(), z.string().max(300)),
    notify: z.boolean(),
    savedAt: z.string().datetime(),
  })
  .strict();
export type LocalScheduleDraft = z.infer<typeof LocalScheduleDraftSchema>;
function storage() {
  return typeof window === "undefined" ? null : window.localStorage;
}
function key(ownerId: string, authVersion: number, scope: string) {
  return PREFIX + ownerId + ":" + authVersion + ":" + scope;
}
export function listLocalScheduleDrafts(
  ownerId: string,
  authVersion: number,
): LocalScheduleDraft[] {
  try {
    const store = storage();
    if (!store) return [];
    const found: LocalScheduleDraft[] = [];
    for (let i = 0; i < store.length; i++) {
      const name = store.key(i);
      if (!name?.startsWith(key(ownerId, authVersion, ""))) continue;
      const result = LocalScheduleDraftSchema.safeParse(
        JSON.parse(store.getItem(name) ?? "null"),
      );
      if (
        result.success &&
        result.data.ownerId === ownerId &&
        result.data.authVersion === authVersion
      )
        found.push(result.data);
    }
    return found.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}
export function readLocalScheduleDraft(
  ownerId: string,
  authVersion: number,
  scope: string,
) {
  return listLocalScheduleDrafts(ownerId, authVersion).find(
    (item) => item.scope === scope,
  );
}
export function writeLocalScheduleDraft(input: LocalScheduleDraft) {
  try {
    const value = LocalScheduleDraftSchema.parse(input),
      store = storage();
    if (!store) return false;
    store.setItem(
      key(value.ownerId, value.authVersion, value.scope),
      JSON.stringify(value),
    );
    window.dispatchEvent(new Event("church:schedule-drafts"));
    return true;
  } catch {
    return false;
  }
}
export function removeLocalScheduleDraft(
  ownerId: string,
  authVersion: number,
  scope: string,
) {
  try {
    storage()?.removeItem(key(ownerId, authVersion, scope));
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("church:schedule-drafts"));
  } catch {}
}
export function clearLocalScheduleDrafts() {
  try {
    const store = storage();
    if (!store) return;
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const name = store.key(i);
      if (name?.startsWith(PREFIX)) keys.push(name);
    }
    for (const name of keys) store.removeItem(name);
    window.dispatchEvent(new Event("church:schedule-drafts"));
  } catch {}
}
