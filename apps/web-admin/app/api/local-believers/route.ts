import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== url.host)
    return new Response(null, { status: 403 });
  try {
    return new Response(
      await readFile(
        resolve(process.cwd(), "../../.local-data/believers.json"),
        "utf8",
      ),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return new Response(null, {
      status: (error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500,
    });
  }
}
