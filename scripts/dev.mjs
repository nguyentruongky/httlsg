import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
function launch(args, cwd = root) {
  const child = spawn(process.execPath, args, { cwd, stdio: "inherit" });
  children.add(child);
  child.on("error", () => stop(1));
  child.on("exit", (code) => {
    children.delete(child);
    stop(code ?? 1);
  });
  return child;
}

// Preparation runs once, from the repository root, before either server starts.
await import("./prepare-dev.mjs");
if (!process.exitCode && !stopping) {
  console.log("Open the application: http://127.0.0.1:5173");
  launch(
    [require.resolve("next/dist/bin/next"), "dev", "--hostname", "0.0.0.0", "--port", "3000"],
    resolve(root, "apps/web-admin"),
  );
  launch(
    [resolve(dirname(require.resolve("vite/package.json")), "bin/vite.js"), "--host", "0.0.0.0", "--port", "5173", "--strictPort"],
    resolve(root, "apps/mobile-client"),
  );
}
