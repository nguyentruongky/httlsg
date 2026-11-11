import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
const root = fileURLToPath(new URL("../", import.meta.url));
const template = await readFile(
  resolve(root, "packages/core/pwa/sw.js"),
  "utf8",
);
const hash = createHash("sha256").update(template);
const logo = await readFile(
  resolve(root, "apps/mobile-client/public/brand-logo.png"),
);
hash.update(logo);
async function sources(path) {
  for (const item of (await readdir(path, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const file = join(path, item.name);
    if (item.isDirectory()) await sources(file);
    else if (/\.(tsx?|css)$/.test(item.name) && !item.name.includes(".test."))
      hash.update(await readFile(file));
  }
}
for (const dir of [
  "apps/mobile-client/src",
  "packages/core/src",
  "packages/ui/src",
])
  await sources(resolve(root, dir));
for (const file of [
  "apps/web-admin/components/providers.tsx",
  "apps/web-admin/app/layout.tsx",
  "apps/web-admin/app/globals.css",
  "scripts/pwa-assets.mjs",
  "package-lock.json",
])
  hash.update(await readFile(resolve(root, file)));
const version = hash.digest("hex").slice(0, 16);
for (const [app, entry] of [
  ["apps/web-admin", "/client"],
  ["apps/mobile-client", "/"],
]) {
  const dest = resolve(root, app, "public/pwa");
  await mkdir(dest, { recursive: true });
  for (const [name, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
    ["maskable-512.png", 512],
  ]) {
    const inset = name === "maskable-512.png" ? Math.round(size * 0.1) : 0;
    const contentSize = size - inset * 2;
    const image = await sharp(logo)
      .resize(contentSize, contentSize, { fit: "contain" })
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: "#ffffff",
      },
    })
      .composite([{ input: image, left: inset, top: inset }])
      .png()
      .toFile(join(dest, name));
  }
  const worker = template
    .replace("__PWA_VERSION__", version)
    .replace("__PWA_ENTRY__", entry);
  await writeFile(
    entry === "/" ? resolve(root, app, "public/sw.js") : join(dest, "sw.js"),
    worker,
  );
  await writeFile(
    join(dest, "offline.html"),
    await readFile(resolve(root, "packages/core/pwa/offline.html")),
  );
  const manifest =
    JSON.stringify(
      {
        id: entry,
        name: "Hội Thánh",
        short_name: "Hội Thánh",
        description: "Ứng dụng thông tin và sinh hoạt của Hội Thánh",
        lang: "vi",
        start_url: entry,
        scope: entry,
        display: "standalone",
        orientation: "any",
        theme_color: "#316b59",
        background_color: "#f6f7f4",
        icons: [
          {
            src: "/pwa/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      null,
      2,
    ) + "\n";
  await writeFile(join(dest, "manifest.webmanifest"), manifest);
  if (entry === "/")
    await writeFile(
      resolve(root, app, "public/manifest.webmanifest"),
      manifest,
    );
}
console.log("Generated public PWA assets for /client and the Vite entry.");
