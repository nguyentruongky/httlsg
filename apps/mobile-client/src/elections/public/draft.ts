import { MAX_ELECTION_SELECTIONS, createRequestId } from "@org/core";
const key = (id: string) => `public-election-selection:${id}`;
export function readPublicDraft(id: string) {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key(id)) ?? "[]");
    return Array.isArray(value) &&
      value.length <= MAX_ELECTION_SELECTIONS &&
      value.every((item) => Number.isInteger(item) && item > 0)
      ? [...new Set(value as number[])]
      : [];
  } catch {
    return [];
  }
}
export function storePublicDraft(id: string, ids: number[]) {
  try {
    sessionStorage.setItem(key(id), JSON.stringify(ids));
  } catch {
    /* Selection remains available in memory. */
  }
}
export function publicVoteRequestId(id: string, ids: number[]) {
  const selection = JSON.stringify([...ids].sort((a, b) => a - b));
  try {
    const previous = JSON.parse(
      sessionStorage.getItem(`public-election-request:${id}`) ?? "null",
    );
    if (previous?.selection === selection && typeof previous?.id === "string")
      return previous.id as string;
    const value = createRequestId();
    sessionStorage.setItem(
      `public-election-request:${id}`,
      JSON.stringify({ id: value, selection }),
    );
    return value;
  } catch {
    return createRequestId();
  }
}
