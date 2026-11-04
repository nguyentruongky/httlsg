import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
function localBelievers(): Plugin {
  return {
    name: "private-local-believers",
    apply: "serve",
    configureServer(server) {
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
  plugins: [react(), tailwind(), localBelievers()],
  server: { host: "127.0.0.1" },
});
