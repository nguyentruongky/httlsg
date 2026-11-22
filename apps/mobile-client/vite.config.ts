import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
function offlineShell(): Plugin {
  let outputDirectory: string;
  return {
    name: "offline-public-shell",
    apply: "build",
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    async writeBundle(_options, bundle) {
      // Vite's index contains only the public app shell, never account data.
      const assets = [
        "/index.html",
        ...Object.keys(bundle)
          .filter((name) => name.startsWith("assets/"))
          .map((name) => "/" + name),
        "/brand-logo.png",
      ];
      const path = resolve(outputDirectory, "sw.js");
      const worker = await readFile(path, "utf8");
      const buildVersion = createHash("sha256")
        .update(worker)
        .update(JSON.stringify(assets))
        .update(await readFile(resolve(outputDirectory, "index.html")))
        .digest("hex")
        .slice(0, 16);
      await writeFile(
        path,
        worker
          .replace(
            "const SHELL_ASSETS = [];",
            `const SHELL_ASSETS = ${JSON.stringify(assets)};`,
          )
          .replace(
            /const VERSION = "[^"]+";/,
            `const VERSION = "${buildVersion}";`,
          ),
      );
    },
  };
}
function localBelievers(): Plugin {
  return {
    name: "private-local-believers",
    apply: "serve",
    configureServer(server) {
      if (process.env.VITE_DEMO_MODE !== "true") return;
      server.middlewares.use("/__local-data/believers", async (req, res) => {
        if (
          req.method !== "GET" ||
          (req.headers.origin &&
            new URL(req.headers.origin).host !== req.headers.host)
        ) {
          res.statusCode = 403;
          res.end();
          return;
        }
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        try {
          res.end(
            await readFile(
              fileURLToPath(
                new URL("../../.local-data/believers.json", import.meta.url),
              ),
              "utf8",
            ),
          );
        } catch (error) {
          res.statusCode =
            (error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500;
          res.end(JSON.stringify({ message: "Không thể tải dữ liệu cục bộ." }));
        }
      });
    },
  };
}
export default defineConfig({
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [react(), tailwind(), localBelievers(), offlineShell()],
  server: {
    host: "0.0.0.0",
    proxy: Object.fromEntries(
      ["/api"].map((path) => [
        path,
        { target: "http://127.0.0.1:3000", changeOrigin: true },
      ]),
    ),
  },
});
