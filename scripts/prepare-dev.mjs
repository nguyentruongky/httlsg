import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Development preparation stopped (${signal ?? code}).`));
    });
  });
}

try {
  const envFile = resolve(root, "apps/web-admin/.env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is missing. For a new local installation, run npm run db:local:setup first.",
    );
  }
  const database = new URL(process.env.DATABASE_URL);
  if (
    ["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) &&
    database.port === "55432" &&
    existsSync(resolve(root, ".local-data/pg-church/PG_VERSION"))
  ) {
    await run(["--import", "tsx", "scripts/local-database.ts", "start"]);
  }
  await run(["scripts/pwa-assets.mjs"]);
  await run(["--import", "tsx", "scripts/database.ts", "migrate"]);
} catch (error) {
  // Never print connection strings or database driver details.
  console.error(
    error instanceof Error && error.code !== "ERR_INVALID_URL"
      ? error.message
      : "Invalid DATABASE_URL. Check your local environment configuration.",
  );
  process.exitCode = 1;
}
