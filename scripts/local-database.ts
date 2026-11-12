import { randomBytes } from "node:crypto";
import {
  mkdir,
  writeFile,
  readFile,
  access,
  unlink,
  chmod,
} from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
const directory = resolve(".local-data"),
  cluster = resolve(directory, "pg-church"),
  socket = resolve(directory, "pg-socket"),
  log = resolve(directory, "pg-church.log"),
  envFile = resolve("apps/web-admin/.env.local");
const port = "55432";
function run(
  binary: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  input?: string,
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(binary, args, { env, stdio: ["pipe", "pipe", "pipe"] });
    // Keep passwords, connection strings, imported names, and SQL out of console output.
    child.stdout.resume();
    child.stderr.resume();
    child.on("error", () =>
      reject(
        new Error(
          `Unable to run ${binary}. Check local PostgreSQL installation.`,
        ),
      ),
    );
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `Local database step failed: ${binary}. Check configuration and the private PostgreSQL log.`,
            ),
          ),
    );
    child.stdin.end(input);
  });
}
async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function main() {
  const command = process.argv[2] ?? "setup";
  if (command === "stop") {
    await run("pg_ctl", ["-D", cluster, "-m", "fast", "-w", "stop"]);
    console.log("Local PostgreSQL stopped.");
    return;
  }
  if (command === "start") {
    if (
      spawnSync("pg_ctl", ["-D", cluster, "status"], { stdio: "ignore" })
        .status === 0
    ) {
      console.log("Local PostgreSQL is already running.");
      return;
    }
    await run("pg_ctl", [
      "-D",
      cluster,
      "-l",
      log,
      "-o",
      `-h 127.0.0.1 -k ${socket} -p ${port}`,
      "-w",
      "start",
    ]);
    console.log("Local PostgreSQL started on port 55432.");
    return;
  }
  if (command !== "setup") throw new Error("Expected setup, start, or stop.");
  if ((await exists(cluster)) || (await exists(envFile)))
    throw new Error(
      "Local database or environment file already exists; nothing was overwritten. Use npm run db:local:start to restart.",
    );
  if (
    spawnSync("pg_isready", ["-h", "127.0.0.1", "-p", port], {
      stdio: "ignore",
    }).status === 0
  )
    throw new Error("Port 55432 is already in use. No database was changed.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await mkdir(socket, { recursive: true, mode: 0o700 });
  await chmod(socket, 0o700);
  const ownerPassword = randomBytes(24).toString("base64url"),
    runtimePassword = randomBytes(24).toString("base64url"),
    adminPassword = randomBytes(24).toString("base64url");
  const passwordFile = resolve(directory, ".pg-owner-password");
  await writeFile(passwordFile, ownerPassword + "\n", {
    mode: 0o600,
    flag: "wx",
  });
  await run("initdb", [
    "-D",
    cluster,
    "-U",
    "church_owner",
    "--pwfile",
    passwordFile,
    "-A",
    "scram-sha-256",
    "--no-locale",
    "-E",
    "UTF8",
  ]);
  await run("pg_ctl", [
    "-D",
    cluster,
    "-l",
    log,
    "-o",
    `-h 127.0.0.1 -k ${socket} -p ${port}`,
    "-w",
    "start",
  ]);
  await unlink(passwordFile);
  const pgEnv = {
    ...process.env,
    PGHOST: "127.0.0.1",
    PGPORT: port,
    PGUSER: "church_owner",
    PGPASSWORD: ownerPassword,
  };
  await run(
    "psql",
    ["-v", "ON_ERROR_STOP=1", "-d", "postgres"],
    pgEnv,
    `CREATE ROLE church_app LOGIN PASSWORD '${runtimePassword}';\nCREATE DATABASE church OWNER church_owner;\n`,
  );
  await run(
    "psql",
    ["-v", "ON_ERROR_STOP=1", "-d", "church", "-f", "database/001_church.sql"],
    pgEnv,
  );
  await run(
    "psql",
    ["-v", "ON_ERROR_STOP=1", "-d", "church"],
    pgEnv,
    "GRANT church_runtime TO church_app;\n",
  );
  await run(
    "psql",
    [
      "-v",
      "ON_ERROR_STOP=1",
      "-d",
      "church",
      "-f",
      "database/002_otp_onboarding.sql",
    ],
    pgEnv,
  );
  for (const migration of [
    "database/003_member_roles.sql",
    "database/004_leader_team_live.sql",
    "database/005_board_otp_access.sql",
    "database/006_profile_merges.sql",
    "database/007_phone_sign_in_otp.sql",
    "database/008_profile_login_identifiers.sql",
    "database/009_persistent_sessions.sql",
    "database/010_session_delete_revocation.sql",
    "database/011_calendar.sql",
    "database/012_immediate_calendar_mail.sql",
    "database/013_worship_information_requests.sql",
    "database/014_worship_viber_email.sql",
    "database/015_automatic_worship_notifications.sql",
    "database/016_calendar_export_email.sql",
    "database/017_department_board_history.sql",
    "database/018_web_push.sql",
    "database/019_ministry_schedules.sql",
    "database/020_reception_team.sql",
    "database/021_reception_cell_text.sql",
    "database/022_non_expiring_otps.sql",
    "database/023_personnel_missions.sql",
    "database/024_calendar_event_ranges.sql",
    "database/025_department_groups_and_choir.sql",
  ])
    await run(
      "psql",
      ["-v", "ON_ERROR_STOP=1", "-d", "church", "-f", migration],
      pgEnv,
    );
  const runtimeUrl = `postgresql://church_app:${runtimePassword}@127.0.0.1:${port}/church`;
  const ownerUrl = `postgresql://church_owner:${ownerPassword}@127.0.0.1:${port}/church`;
  await writeFile(
    envFile,
    `# Generated local development settings; never commit.\nDATABASE_URL=${runtimeUrl}\nMIGRATION_DATABASE_URL=${ownerUrl}\nSESSION_SECRET=${randomBytes(32).toString("base64")}\nAPP_ORIGIN=http://127.0.0.1:3000\nOTP_SECRET=${randomBytes(32).toString("base64")}\nEMAIL_DELIVERY_MODE=file\n`,
    { mode: 0o600, flag: "wx" },
  );
  const appEnv = { ...process.env, DATABASE_URL: runtimeUrl };
  if (await exists(resolve(directory, "believers.json")))
    await run(
      process.execPath,
      ["--import", "tsx", "scripts/database.ts", "import"],
      appEnv,
    );
  await run(
    process.execPath,
    ["--import", "tsx", "scripts/database.ts", "bootstrap"],
    {
      ...appEnv,
      ADMIN_EMAIL: "admin@church.local",
      ADMIN_PASSWORD: adminPassword,
      ADMIN_NAME: "Quản trị viên",
    },
  );
  await writeFile(
    resolve(directory, "local-auth.txt"),
    `Local development login\nURL: http://localhost:5173/login\nEmail: admin@church.local\nPassword: ${adminPassword}\n\nStart PostgreSQL: npm run db:local:start\nStop PostgreSQL: npm run db:local:stop\nStart application and PostgreSQL: npm run dev\n\nThese credentials are for this private local installation only.\n`,
    { mode: 0o600, flag: "wx" },
  );
  console.log(
    "Local PostgreSQL is ready on port 55432. Member profiles imported and administrator created. Credentials: .local-data/local-auth.txt",
  );
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Local setup failed.");
  process.exitCode = 1;
});
