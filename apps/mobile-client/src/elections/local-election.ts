import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  apiRequest,
  ApiError,
  createRequestId,
  ticketOutcome,
  type ElectionTicketKind,
} from "@org/core";
export type LocalTicket = {
  client_uuid: string;
  ticket_code: string;
  round_id: number;
  election_id?: number;
  team_id?: string;
  team_ticket_no?: number;
  user_id: string;
  seq_no: number;
  candidate_ids: number[];
  entry_kind?: ElectionTicketKind;
  status: string;
  invalid_reason: string | null;
  created_at: string;
  sync_state: "pending" | "synced" | "rejected";
  server_ack_at?: string;
  rejection?: string;
};
type Action = {
  id?: number;
  ts: string;
  user_id: string;
  round_id: number;
  type: string;
  payload: unknown;
  prev_hash: string;
  hash: string;
};
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const completed = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Không thể lưu dữ liệu."));
  });
let connection: Promise<IDBDatabase> | undefined;
async function db() {
  return (connection ??= new Promise((resolve, reject) => {
    const r = indexedDB.open("church-election-backup", 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore("local_ticket", { keyPath: "client_uuid" });
      d.createObjectStore("local_action", {
        keyPath: "id",
        autoIncrement: true,
      });
      d.createObjectStore("local_meta", { keyPath: "key" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
// Synchronous SHA-256 also works on HTTP LAN origins without crypto.subtle.
const digest = (value: string) =>
  bytesToHex(sha256(new TextEncoder().encode(value)));
async function append(
  user: string,
  round: number,
  type: string,
  payload: unknown,
  ticket?: LocalTicket | ((sequence: number) => LocalTicket),
  sequenceKey?: string,
): Promise<LocalTicket | undefined> {
  const database = await db();
  // IndexedDB serializes these overlapping read/write transactions across tabs.
  // Read the chain head, allocate the sequence, and append in one transaction.
  // No network or asynchronous hashing may run while the transaction is active.
  const tx = database.transaction(
    ["local_ticket", "local_action", "local_meta"],
    "readwrite",
  );
  const done = completed(tx);
  const meta = tx.objectStore("local_meta");
  let saved: LocalTicket | undefined;
  try {
    const [previous, sequence, tickets, existing] = await Promise.all([
      request<any>(meta.get(`chain_head:${user}`)),
      sequenceKey
        ? request<any>(meta.get(sequenceKey))
        : Promise.resolve(undefined),
      sequenceKey
        ? request<LocalTicket[]>(tx.objectStore("local_ticket").getAll())
        : Promise.resolve([]),
      ticket && typeof ticket !== "function"
        ? request<LocalTicket | undefined>(
            tx.objectStore("local_ticket").get(ticket.client_uuid),
          )
        : Promise.resolve(undefined),
    ]);
    const number =
      Math.max(
        Number(sequence?.value ?? 0),
        0,
        ...tickets
          .filter((value) => value.user_id === user && value.round_id === round)
          .map((value) => value.seq_no),
      ) + 1;
    saved = typeof ticket === "function" ? ticket(number) : ticket;
    // A delayed retry in another tab must not reject an already acknowledged ballot.
    if (existing?.sync_state === "synced" && saved?.sync_state === "rejected")
      saved = existing;
    const prev_hash = previous?.value ?? "";
    const record = {
      ts: new Date().toISOString(),
      user_id: user,
      round_id: round,
      type,
      payload,
      prev_hash,
    };
    const hash = digest(prev_hash + JSON.stringify(record));
    if (saved) tx.objectStore("local_ticket").put(saved);
    tx.objectStore("local_action").add({ ...record, hash });
    meta.put({ key: `chain_head:${user}`, value: hash });
    if (sequenceKey && saved)
      meta.put({ key: sequenceKey, value: saved.seq_no });
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Transaction may already have aborted. */
    }
    await done.catch(() => {});
    throw error;
  }
  await done;
  window.dispatchEvent(new Event("election-local-change"));
  return saved;
}
export const logElectionAction = (
  user: string,
  round: number,
  type: string,
  payload: unknown = {},
) => append(user, round, type, payload);
export async function localTickets(user: string, round?: number) {
  const database = await db();
  const values = await request<LocalTicket[]>(
    database
      .transaction("local_ticket", "readonly")
      .objectStore("local_ticket")
      .getAll(),
  );
  return values
    .filter(
      (t) =>
        t.user_id === user && (round === undefined || t.round_id === round),
    )
    .sort((a, b) => a.seq_no - b.seq_no);
}
export async function localMeta(key: string, value?: unknown) {
  const database = await db();
  if (value !== undefined) {
    const tx = database.transaction("local_meta", "readwrite");
    const done = completed(tx);
    tx.objectStore("local_meta").put({ key, value });
    await done;
    return value;
  }
  return (
    await request<any>(
      database
        .transaction("local_meta", "readonly")
        .objectStore("local_meta")
        .get(key),
    )
  )?.value;
}
export async function saveLocalTicket(
  user: string,
  round: any,
  candidate_ids: number[],
  entry_kind: ElectionTicketKind = "normal",
): Promise<LocalTicket> {
  if (!round.assignment?.team_id)
    throw new Error(
      "Cần được phân công vào tổ kiểm phiếu trước khi lưu phiếu.",
    );
  const client_uuid = createRequestId();
  const ticket = await append(
    user,
    round.id,
    "ticket_submitted",
    { client_uuid, candidate_ids, entry_kind },
    (seq_no) => ({
      client_uuid,
      ticket_code: `E${round.election_id}-T${round.assignment.team_id}-${client_uuid}`,
      election_id: round.election_id,
      team_id: round.assignment.team_id,
      round_id: round.id,
      user_id: user,
      seq_no,
      candidate_ids: [...candidate_ids],
      entry_kind,
      ...ticketOutcome(candidate_ids, entry_kind),
      created_at: new Date().toISOString(),
      sync_state: "pending",
    }),
    `seq:${user}:${round.id}`,
  );
  return ticket!;
}

export async function verifyElectionChain(actions: Action[]) {
  let previous = "";
  for (const action of actions) {
    const { id, hash, ...record } = action;
    if (
      record.prev_hash !== previous ||
      (await digest(previous + JSON.stringify(record))) !== hash
    )
      return false;
    previous = hash;
  }
  return true;
}
export async function exportElectionBackup(user: string, round?: number) {
  const database = await db();
  const actions = await request<Action[]>(
    database
      .transaction("local_action", "readonly")
      .objectStore("local_action")
      .getAll(),
  );
  return {
    version: 1,
    user_id: user,
    exported_at: new Date().toISOString(),
    tickets: await localTickets(user, round),
    actions: actions.filter((a) => a.user_id === user),
    chain_valid: await verifyElectionChain(
      actions.filter((a) => a.user_id === user),
    ),
  };
}
async function performSync(user: string) {
  if (!navigator.onLine) return;
  const work = async () => {
    for (const ticket of (await localTickets(user))
      .filter((t) => t.sync_state === "pending")
      .sort(
        (a, b) =>
          Date.parse(a.created_at) - Date.parse(b.created_at) ||
          a.seq_no - b.seq_no,
      )) {
      const retry = await localMeta(`retry:${ticket.client_uuid}`);
      if (retry && Date.now() < retry.at) break;
      try {
        const result = await apiRequest<any>(
          `/api/rounds/${ticket.round_id}/tickets`,
          { method: "POST", body: JSON.stringify(ticket) },
        );
        if (!["ok", "duplicate", "rejected"].includes(result.state))
          throw new Error("Phản hồi không hợp lệ.");
        const next: LocalTicket =
          result.state === "rejected"
            ? { ...ticket, sync_state: "rejected", rejection: result.reason }
            : {
                ...ticket,
                ...{
                  ticket_code: result.ticket.ticket_code,
                  election_id: result.ticket.election_id,
                  team_id: result.ticket.team_id,
                  team_ticket_no: result.ticket.team_ticket_no,
                  status: result.ticket.status,
                  invalid_reason: result.ticket.invalid_reason,
                },
                sync_state: "synced",
                server_ack_at: new Date().toISOString(),
              };
        await append(
          user,
          ticket.round_id,
          result.state === "rejected" ? "ticket_sync_failed" : "ticket_sync_ok",
          { client_uuid: ticket.client_uuid, reason: result.reason },
          next,
        );
      } catch (error) {
        if (
          error instanceof ApiError &&
          [400, 403, 404, 409, 422].includes(error.status)
        ) {
          await append(
            user,
            ticket.round_id,
            "ticket_sync_failed",
            { client_uuid: ticket.client_uuid, error: error.message },
            { ...ticket, sync_state: "rejected", rejection: error.message },
          );
          continue;
        }
        const attempts = (retry?.attempts ?? 0) + 1;
        await localMeta(`retry:${ticket.client_uuid}`, {
          attempts,
          at: Date.now() + Math.min(60000, 1000 * 2 ** Math.min(attempts, 6)),
        });
        await logElectionAction(user, ticket.round_id, "ticket_sync_failed", {
          client_uuid: ticket.client_uuid,
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }
    }
  };
  const locks = navigator.locks;
  if (typeof locks?.request === "function") {
    await locks.request(
      `church-election-sync:${user}`,
      { ifAvailable: true },
      async (lock) => {
        if (lock) await work();
      },
    );
  } else {
    // Concurrent tabs may retry a UUID; the API acknowledges it idempotently.
    await work();
  }
}
const syncFlights = new Map<string, Promise<void>>();
export async function syncElectionTickets(user: string) {
  const current = syncFlights.get(user);
  if (current) return current;
  const flight = performSync(user);
  syncFlights.set(user, flight);
  try {
    await flight;
  } finally {
    if (syncFlights.get(user) === flight) syncFlights.delete(user);
  }
}
export function downloadElectionFile(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
