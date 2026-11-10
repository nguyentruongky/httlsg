import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { PasswordSchema } from "../packages/core/src/auth-contract";
import { registerLocalDataset } from "../packages/core/src/local-data";
import { pool, transaction } from "../apps/web-admin/lib/server/db";
import { hashPassword } from "../apps/web-admin/lib/server/password";
async function main() {
  const env = resolve("apps/web-admin/.env.local");
  try {
    await access(env);
    process.loadEnvFile(env);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const command = process.argv[2];
  if (command === "migrate" && process.env.MIGRATION_DATABASE_URL)
    process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;
  async function migrate() {
    const found = await pool().query(
      "SELECT to_regclass('church.member_profiles') present, to_regclass('church.users') legacy",
    );
    if (!found.rows[0].present && !found.rows[0].legacy)
      await pool().query(
        await readFile(resolve("database/001_church.sql"), "utf8"),
      );
    if (!found.rows[0].present)
      await pool().query(
        await readFile(resolve("database/002_otp_onboarding.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=3",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/003_member_roles.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=4",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/004_leader_team_live.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=5",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/005_board_otp_access.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=6",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/006_profile_merges.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=7",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/007_phone_sign_in_otp.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=8",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(
          resolve("database/008_profile_login_identifiers.sql"),
          "utf8",
        ),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=9",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/009_persistent_sessions.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=10",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(
          resolve("database/010_session_delete_revocation.sql"),
          "utf8",
        ),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=11",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/011_calendar.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=12",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(
          resolve("database/012_immediate_calendar_mail.sql"),
          "utf8",
        ),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=13",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(
          resolve("database/013_worship_information_requests.sql"),
          "utf8",
        ),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=14",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/014_worship_viber_email.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=15",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(
          resolve("database/015_automatic_worship_notifications.sql"),
          "utf8",
        ),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=16",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(
          resolve("database/016_calendar_export_email.sql"),
          "utf8",
        ),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=17",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(
          resolve("database/017_department_board_history.sql"),
          "utf8",
        ),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=18",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/018_web_push.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=19",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/019_ministry_schedules.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=20",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/020_reception_team.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=21",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/021_reception_cell_text.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=22",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/022_non_expiring_otps.sql"), "utf8"),
      );
    if (
      !(
        await pool().query(
          "SELECT 1 FROM church.schema_migrations WHERE version=23",
        )
      ).rowCount
    )
      await pool().query(
        await readFile(resolve("database/023_personnel_missions.sql"), "utf8"),
      );
    await pool().query(
      "CREATE INDEX IF NOT EXISTS otps_department ON church.otps(department_id)",
    );
    console.log("Church migrations are up to date.");
  }

  async function bootstrap() {
    const email = z
      .email()
      .parse(process.env.ADMIN_EMAIL?.trim().toLowerCase());
    const password = PasswordSchema.parse(process.env.ADMIN_PASSWORD);
    const encoded = await hashPassword(password);
    await transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(74298331)");
      const exists = await db.query(
        "SELECT id FROM church.users WHERE role_id IN ('admin','secretary') AND password_hash IS NOT NULL AND enabled AND deleted_at IS NULL LIMIT 1",
      );
      if (exists.rowCount)
        throw new Error(
          "An administrator already exists. Manage further accounts from the dashboard.",
        );
      const existing = await db.query(
        "SELECT id,password_hash FROM church.users WHERE email=$1",
        [email],
      );
      if (existing.rows[0]?.password_hash)
        throw new Error(
          "Existing login credentials cannot be overwritten by bootstrap.",
        );
      if (existing.rowCount)
        throw new Error(
          "An account already exists; bootstrap will not overwrite it.",
        );
      const name = process.env.ADMIN_NAME ?? "Quản trị viên";
      const profile = (
        await db.query(
          "INSERT INTO church.member_profiles(email,full_name,role_id) VALUES($1,$2,'admin') RETURNING id",
          [email, name],
        )
      ).rows[0];
      await db.query(
        "INSERT INTO church.users(id,email,full_name,password_hash,role_id,is_password_set) VALUES($1,$2,$3,$4,'admin',true)",
        [profile.id, email, name, encoded],
      );
    });
    console.log(
      "Administrator created. No password was printed or stored in source.",
    );
  }
  async function importMembers() {
    const dataset = registerLocalDataset(
      JSON.parse(
        await readFile(
          resolve(process.argv[3] ?? ".local-data/believers.json"),
          "utf8",
        ),
      ),
    );
    let inserted = 0;
    await transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(74298331)");
      for (const d of dataset.departments)
        await db.query(
          "INSERT INTO church.departments(id,name) VALUES($1,$2) ON CONFLICT(id) DO NOTHING",
          [d.id, d.name],
        );
      const fresh = new Set<string>();
      for (const member of dataset.members) {
        const p = dataset.profiles[member.id];
        if (!p || p.testAccount) continue;
        if (
          (
            await db.query(
              "SELECT 1 FROM church.profile_merges WHERE source_id=$1",
              [member.id],
            )
          ).rowCount
        )
          continue;
        const f = p.fields,
          source = p.source;
        const row = await db.query(
          `INSERT INTO church.member_profiles(id,email,full_name,phone,date_of_birth,address,occupation,bio,area,location,church_status,faith_date,baptism_date,preferred_name,gender,household_role,source,created_at)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT(id) DO NOTHING RETURNING id`,
          [
            member.id,
            member.user.email?.trim().toLowerCase() ?? null,
            member.user.name,
            f.phone || null,
            f.dateOfBirth || null,
            f.address,
            f.occupation,
            f.bio,
            f.area || null,
            f.location || null,
            f.churchStatus || null,
            f.faithDate || source?.faithDate || null,
            f.baptismDate || source?.baptismDate || null,
            f.preferredName ?? source?.preferredName ?? "",
            f.gender ?? source?.gender ?? "",
            f.householdRole ?? source?.familyRole ?? "",
            source ? JSON.stringify(source) : null,
            member.joinedAt,
          ],
        );
        if (!row.rowCount) continue;
        inserted++;
        fresh.add(member.id);
        for (const department of f.departmentIds)
          await db.query(
            "INSERT INTO church.department_members(user_id,department_id,position) VALUES($1,$2,$3)",
            [member.id, department, f.departmentRoles?.[department] ?? ""],
          );
        const visited = f.lastVisitDate || source?.lastVisitDate;
        if (visited)
          await db.query(
            "INSERT INTO church.visits(member_id,visited_on) VALUES($1,$2)",
            [member.id, visited],
          );
      }
      // Imported links were resolved by the workbook importer. Never group ambiguous names.
      const parent = new Map<string, string>();
      function root(id: string): string {
        const p = parent.get(id);
        if (!p) {
          parent.set(id, id);
          return id;
        }
        if (p === id) return id;
        const r = root(p);
        parent.set(id, r);
        return r;
      }
      for (const id of fresh)
        for (const relative of dataset.profiles[id].fields.familyMembers)
          if (fresh.has(relative.id)) parent.set(root(relative.id), root(id));
      const groups = new Map<string, string[]>();
      for (const id of fresh) {
        const key = root(id);
        groups.set(key, [...(groups.get(key) ?? []), id]);
      }
      for (const ids of groups.values())
        if (ids.length > 1) {
          const household = (
            await db.query(
              "INSERT INTO church.households DEFAULT VALUES RETURNING id",
            )
          ).rows[0].id;
          for (const id of ids)
            await db.query(
              "INSERT INTO church.household_members(user_id,household_id,relationship) VALUES($1,$2,$3)",
              [
                id,
                household,
                (dataset.profiles[id].fields.householdRole ??
                  dataset.profiles[id].source?.familyRole) ||
                  "Thành viên",
              ],
            );
        }
    });
    console.log(
      `Imported ${inserted} profiles. Existing profiles were preserved. Imported profiles have no login password or elevated role.`,
    );
  }
  try {
    if (command === "migrate") await migrate();
    else if (command === "bootstrap") await bootstrap();
    else if (command === "import") await importMembers();
    else throw new Error("Expected migrate, bootstrap, or import.");
  } catch (error) {
    // No database driver detail or member records are printed.
    console.error(
      error instanceof z.ZodError
        ? "Invalid setup input. Check email and password (minimum 12 characters)."
        : error instanceof Error && error.message.startsWith("Church schema")
          ? error.message
          : error instanceof Error &&
              /administrator|bootstrap|Expected/.test(error.message)
            ? error.message
            : "Database setup failed. Check connection, privileges, migration state, and input data.",
    );
    process.exitCode = 1;
  } finally {
    if (process.env.DATABASE_URL) await pool().end();
  }
}
void main();
