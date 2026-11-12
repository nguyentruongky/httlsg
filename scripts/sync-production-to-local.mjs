import { spawn } from "node:child_process";
import { resolve } from "node:path";

const localEnvFile = resolve("apps/web-admin/.env.local");
const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(
    "Set PRODUCTION_DATABASE_URL and LOCAL_DATABASE_URL, then run npm run db:sync:production-to-local -- --confirm.",
  );
  process.exit(0);
}

if (!args.includes("--confirm")) {
  throw new Error(
    "Refusing to sync without --confirm. This overwrites all local data.",
  );
}

try {
  process.loadEnvFile(localEnvFile);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

function connection(value, label) {
  if (!value) throw new Error(`${label} is not configured.`);
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error(`${label} must be a PostgreSQL connection URL.`);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!url.hostname || !url.username || !database)
    throw new Error(`${label} is missing a host, user, or database name.`);

  const childEnv = { ...process.env };
  for (const name of [
    "DATABASE_URL",
    "SOURCE_DATABASE_URL",
    "PRODUCTION_DATABASE_URL",
    "LOCAL_DATABASE_URL",
  ])
    delete childEnv[name];

  Object.assign(childEnv, {
    PGHOST: url.hostname.replace(/^\[|\]$/g, ""),
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: database,
    PGCONNECT_TIMEOUT: "10",
  });

  for (const [parameter, variable] of [
    ["sslmode", "PGSSLMODE"],
    ["sslrootcert", "PGSSLROOTCERT"],
    ["sslcert", "PGSSLCERT"],
    ["sslkey", "PGSSLKEY"],
  ]) {
    const value = url.searchParams.get(parameter);
    if (value) childEnv[variable] = value;
  }

  return {
    env: childEnv,
    host: url.hostname.replace(/^\[|\]$/g, "").toLowerCase(),
    port: url.port || "5432",
    database,
  };
}

function runCapture(binary, commandArgs, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(binary, commandArgs, {
      env,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (output += chunk));
    child.once("error", () =>
      reject(
        new Error(
          `Unable to start ${binary}; install PostgreSQL client tools.`,
        ),
      ),
    );
    child.once("close", (code) =>
      code === 0
        ? resolvePromise(output.trim())
        : reject(new Error(`${binary} failed; verify database access.`)),
    );
  });
}

function restore(source, target) {
  return new Promise((resolvePromise, reject) => {
    const dump = spawn(
      "pg_dump",
      [
        "--format=custom",
        "--schema=church",
        "--no-owner",
        "--no-acl",
        "--dbname",
        source.database,
      ],
      { env: source.env, stdio: ["ignore", "pipe", "ignore"] },
    );
    const load = spawn(
      "pg_restore",
      [
        "--format=custom",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-acl",
        "--exit-on-error",
        "--single-transaction",
        "--dbname",
        target.database,
      ],
      { env: target.env, stdio: ["pipe", "ignore", "ignore"] },
    );
    let dumpCode;
    let loadCode;
    let settled = false;

    const fail = (message) => {
      if (settled) return;
      settled = true;
      dump.kill();
      load.kill();
      reject(new Error(message));
    };
    const finishIfReady = () => {
      if (settled || dumpCode === undefined || loadCode === undefined) return;
      if (dumpCode !== 0 || loadCode !== 0) {
        fail(
          "Production-to-local sync failed; verify both connections.",
        );
        return;
      }
      settled = true;
      resolvePromise();
    };

    dump.once("error", () =>
      fail("Unable to start pg_dump; install PostgreSQL client tools."),
    );
    load.once("error", () =>
      fail("Unable to start pg_restore; install PostgreSQL client tools."),
    );
    load.stdin.once("error", () =>
      fail("Database restore stream failed; verify target connectivity."),
    );
    dump.stdout.pipe(load.stdin);
    dump.once("close", (code) => {
      dumpCode = code;
      finishIfReady();
    });
    load.once("close", (code) => {
      loadCode = code;
      finishIfReady();
    });
  });
}

async function main() {
  const production = connection(
    process.env.PRODUCTION_DATABASE_URL,
    "PRODUCTION_DATABASE_URL",
  );
  const local = connection(
    process.env.LOCAL_DATABASE_URL ?? process.env.DATABASE_URL,
    "LOCAL_DATABASE_URL (fallback DATABASE_URL)",
  );
  if (
    production.host === local.host &&
    production.port === local.port &&
    production.database === local.database
  )
    throw new Error(
      "Production and local point to the same database. No data was changed.",
    );

  console.log(
    `Dumping production church schema from ${production.host}:${production.port}/${production.database}...`,
  );
  console.log(
    `Restoring into local ${local.host}:${local.port}/${local.database}...`,
  );
  await restore(production, local);
  console.log(
    "Production-to-local sync completed successfully. Local database now mirrors production.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Sync failed.");
  process.exitCode = 1;
});
