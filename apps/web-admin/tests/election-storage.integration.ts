import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { electionDispatch, roundResults } from "../lib/server/elections";
import type { AuthUser } from "@org/core";

async function main() {
  // Explicit opt-in: executes real queries inside one rolled-back local transaction.
  process.loadEnvFile("apps/web-admin/.env.local");
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
    "Local database required",
  );
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const request = new Request("http://localhost/api/elections");
  let checks = 0;
  const check = (condition: unknown, message: string) => {
    assert.ok(condition, message);
    checks++;
  };
  try {
    await db.connect();
    await db.query("BEGIN");
    if (process.argv.includes("--preview"))
      await db.query(
        readFileSync("database/052_consolidate_election_storage.sql", "utf8")
          .replace(/^BEGIN;\s*/, "")
          .replace(/COMMIT;\s*$/, ""),
      );
    const accounts = (
      await db.query(
        "SELECT id FROM church.users WHERE enabled AND deleted_at IS NULL ORDER BY id LIMIT 2",
      )
    ).rows;
    assert.equal(
      accounts.length,
      2,
      "Two existing local accounts are required",
    );
    const actor = (id: string, role: "admin" | "election_scrutineer") =>
      ({ id, role, roles: [role], name: "Integration fixture" }) as AuthUser;
    const admin = actor(accounts[0].id, "admin");
    const worker = actor(accounts[1].id, "election_scrutineer");
    const dispatch = (
      who: AuthUser,
      path: string[],
      input: unknown = {},
      method = "POST",
    ) => electionDispatch(db, who, path, method, input, request);
    let electionId: number, roundId: number, candidateIds: number[];
    if (process.argv.includes("--migration")) {
      // Populate old storage so migration is verified with nonempty selections and assignments.
      const election = (
        await db.query(
          "INSERT INTO church.election_contests(name,created_by) VALUES('Migration fixture',$1) RETURNING id",
          [admin.id],
        )
      ).rows[0];
      electionId = election.id;
      const team = (
        await db.query(
          "INSERT INTO church.election_scrutineer_teams(election_id,name,sort_order) VALUES($1,'Exact team',9) RETURNING id",
          [electionId],
        )
      ).rows[0];
      await db.query(
        "INSERT INTO church.election_scrutineer_teams(election_id,name,sort_order) VALUES($1,'Empty team',10)",
        [electionId],
      );
      await db.query(
        "INSERT INTO church.election_scrutineer_members(election_id,member_id,team_id,position,added_by) VALUES($1,$2,$3,7,$4)",
        [electionId, worker.id, team.id, admin.id],
      );
      const round = (
        await db.query(
          "INSERT INTO church.election_rounds(election_id,round_no) VALUES($1,1) RETURNING id",
          [electionId],
        )
      ).rows[0];
      roundId = round.id;
      candidateIds = (
        await db.query(
          "INSERT INTO church.election_nominees(election_id,candidate_no,full_name,name_search) SELECT $1,n,'Candidate '||n,'candidate '||n FROM generate_series(1,12) n RETURNING id",
          [electionId],
        )
      ).rows.map((r) => r.id);
      await db.query(
        "INSERT INTO church.election_round_candidates(round_id,candidate_id,source) SELECT $1,unnest($2::int[]),'initial'",
        [roundId, candidateIds],
      );
      await db.query(
        "INSERT INTO church.election_round_scrutineers(round_id,user_id,code,pending_count,heartbeat_at) VALUES($1,$2,'S19',3,now())",
        [roundId, worker.id],
      );
      const ticket = (
        await db.query(
          "INSERT INTO church.election_tickets(ticket_code,client_uuid,round_id,scrutineer_id,seq_no,status,created_at) VALUES($1,$2,$3,$4,1,'valid',now()) RETURNING id",
          [`E${electionId}-R1-S19-0001`, randomUUID(), roundId, worker.id],
        )
      ).rows[0];
      await db.query(
        "INSERT INTO church.election_ticket_selections(ticket_id,candidate_id) SELECT $1,unnest($2::int[])",
        [ticket.id, candidateIds.slice(0, 2)],
      );
      await db.query(
        "UPDATE church.election_rounds SET status='open',opened_at=now() WHERE id=$1",
        [roundId],
      );
      const sql = readFileSync(
        "database/052_consolidate_election_storage.sql",
        "utf8",
      )
        .replace(/^BEGIN;\s*/, "")
        .replace(/COMMIT;\s*$/, "");
      await db.query(sql);
      const migrated = (
        await db.query(
          "SELECT candidate_ids FROM church.election_tickets WHERE id=$1",
          [ticket.id],
        )
      ).rows[0];
      assert.deepEqual(migrated.candidate_ids, candidateIds.slice(0, 2));
      checks++;
      const roster = await dispatch(
        admin,
        ["elections", String(electionId), "scrutineers"],
        {},
        "GET",
      );
      check(
        roster.teams.some(
          (t: any) => t.name === "Empty team" && t.members.length === 0,
        ),
        "Empty team preserved",
      );
      check(
        roster.teams.find((t: any) => t.id === team.id)?.members[0].position ===
          7,
        "Exact team ID and position preserved",
      );
      const assignment = (
        await db.query(
          "SELECT * FROM church.election_scrutineers WHERE round_id=$1",
          [roundId],
        )
      ).rows[0];
      check(
        assignment.code === "S19" &&
          assignment.pending_count === 3 &&
          assignment.heartbeat_at,
        "Round sync state preserved",
      );
      check(
        (await roundResults(db, roundId)).summary.valid === 1,
        "Migrated ballot counted",
      );
      console.log(
        `Migration fixture checks passed: ${checks} (plus migration SQL integrity assertions)`,
      );
    } else {
      const election = await dispatch(admin, ["elections"], {
        name: "Storage integration fixture",
      });
      electionId = election.id;
      const profile = (
        await db.query(
          "INSERT INTO church.member_profiles(full_name) VALUES('No account fixture') RETURNING id",
        )
      ).rows[0];
      const roster = await dispatch(
        admin,
        ["elections", String(electionId), "scrutineers"],
        {},
        "GET",
      );
      const team = roster.teams[0];
      const otherTeam = roster.teams[1];
      await dispatch(admin, ["elections", String(electionId), "scrutineers"], {
        memberId: worker.id,
        teamId: team.id,
      });
      await dispatch(admin, ["elections", String(electionId), "scrutineers"], {
        memberId: profile.id,
        teamId: team.id,
      });
      check(
        !(
          await db.query("SELECT id FROM church.users WHERE id=$1", [
            profile.id,
          ])
        ).rowCount,
        "Member added without account",
      );
      const reordered = await dispatch(
        admin,
        ["elections", String(electionId), "scrutineers"],
        {
          action: "reorder",
          teamId: team.id,
          memberIds: [profile.id, worker.id],
        },
      );
      assert.deepEqual(
        reordered.teams[0].members.map((m: any) => m.id),
        [profile.id, worker.id],
      );
      checks++;
      await assert.rejects(
        dispatch(admin, ["elections", String(electionId), "scrutineers"], {
          memberId: worker.id,
          teamId: otherTeam.id,
        }),
        /Thành viên đã thuộc/,
      );
      checks++;
      const repeated = await dispatch(
        admin,
        ["elections", String(electionId), "scrutineers"],
        { memberId: worker.id, teamId: team.id },
      );
      check(
        repeated.teams[0].members.length === 2,
        "Repeated grants are idempotent",
      );
      const created = await dispatch(
        admin,
        ["elections", String(electionId), "scrutineers"],
        { action: "create_team" },
      );
      check(created.teams.length === 5, "Empty team persisted");
      candidateIds = (
        await db.query(
          "INSERT INTO church.election_nominees(election_id,candidate_no,full_name,name_search) SELECT $1,n,'Candidate '||n,'candidate '||n FROM generate_series(1,12) n RETURNING id",
          [electionId],
        )
      ).rows.map((r) => r.id);
      const round = await dispatch(admin, [
        "elections",
        String(electionId),
        "rounds",
      ]);
      roundId = round.id;
      await dispatch(admin, ["rounds", String(roundId), "configure"], {
        userIds: [worker.id],
      });
      const assigned = await dispatch(
        worker,
        ["rounds", "assigned"],
        {},
        "GET",
      );
      check(
        assigned.rounds.some(
          (r: any) => r.id === roundId && r.assignment.code === "S01",
        ),
        "Assigned waiting round and generated code",
      );
      await dispatch(admin, ["rounds", String(roundId), "start"]);
      const submit = (seq: number, ids: number[], uuid = randomUUID()) =>
        dispatch(worker, ["rounds", String(roundId), "tickets"], {
          seq_no: seq,
          candidate_ids: ids,
          client_uuid: uuid,
          created_at: new Date().toISOString(),
        });
      const uuid = randomUUID();
      const valid = await submit(1, candidateIds.slice(0, 2), uuid);
      check(valid.ticket.status === "valid", "Valid ballot accepted");
      check(
        (await submit(1, [candidateIds[1], candidateIds[0]], uuid)).state ===
          "duplicate",
        "Offline retry is idempotent",
      );
      await assert.rejects(submit(1, [candidateIds[0]], uuid), /phiếu khác/);
      checks++;
      check(
        (await submit(2, [])).ticket.invalid_reason === "blank",
        "Blank ballot accepted",
      );
      check(
        (await submit(3, candidateIds.slice(0, 11))).ticket.invalid_reason ===
          "over_limit",
        "Over-limit ballot accepted",
      );
      const toVoid = await submit(4, [candidateIds[0]]);
      await dispatch(admin, ["tickets", String(toVoid.ticket.id), "void"], {
        reason: "Fixture correction",
      });
      check(
        (await submit(5, [candidateIds[0], candidateIds[0]])).state ===
          "rejected",
        "Duplicate candidates rejected",
      );
      await dispatch(worker, ["rounds", String(roundId), "heartbeat"], {
        pending: 2,
      });
      const result = await dispatch(
        admin,
        ["rounds", String(roundId), "results"],
        {},
        "GET",
      );
      assert.deepEqual(result.summary, {
        received: 4,
        valid: 1,
        invalid: 2,
        over_limit: 1,
        blank: 1,
        void: 1,
        average: 2,
      });
      checks++;
      check(
        result.results[0].votes === 1 && result.results[1].votes === 1,
        "Void, blank and over-limit excluded from tally",
      );
      check(
        result.results[0].percent === 100 && result.results[1].percent === 100,
        "Valid-ballot denominator used",
      );
      check(
        result.results[0].tie &&
          result.results[1].tie &&
          result.results[0].rank === 1,
        "Tie indicators retained",
      );
      check(
        result.results
          .slice(2)
          .every((r: any) => r.votes === 0 && r.percent === 0),
        "Zero-vote candidates retained",
      );
      check(
        result.progress[0].pending_count === 2,
        "Heartbeat updates consolidated row",
      );
      check(
        !Object.keys(result.round).some((k) => k.startsWith("paper_")),
        "No paper fields in payload",
      );
      const tickets = await dispatch(
        worker,
        ["rounds", String(roundId), "tickets"],
        {},
        "GET",
      );
      check(
        tickets.items.find((t: any) => t.id === valid.ticket.id).candidates
          .length === 2,
        "Ticket detail resolves embedded selections",
      );
      await dispatch(admin, ["rounds", String(roundId), "stop"]);
      const next = await dispatch(
        admin,
        ["rounds", String(roundId), "prepare-next"],
        { rule: "top", value: 2, dryRun: false },
      );
      check(
        (
          await db.query(
            "SELECT code FROM church.election_scrutineers WHERE round_id=$1",
            [next.id],
          )
        ).rows[0].code === "S01",
        "Next round retains assignment code",
      );
      console.log(`Election integration checks passed: ${checks}`);
    }
  } finally {
    await db.query("ROLLBACK").catch(() => {});
    await db.end();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
