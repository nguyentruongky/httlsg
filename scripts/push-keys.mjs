import { generateVAPIDKeys } from "web-push";
import { readFile, writeFile, chmod } from "node:fs/promises";
const path = new URL("../apps/web-admin/.env.local", import.meta.url);
let original = "";
try {
  original = await readFile(path, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const publicExists = /^VAPID_PUBLIC_KEY=.+/m.test(original),
  privateExists = /^VAPID_PRIVATE_KEY=.+/m.test(original);
if (publicExists && privateExists) {
  await chmod(path, 0o600);
  console.log("VAPID keys already exist; left unchanged.");
} else if (publicExists || privateExists) {
  throw new Error(
    "Incomplete VAPID configuration. Restore the matching key pair before generating replacement keys.",
  );
} else {
  const { publicKey, privateKey } = generateVAPIDKeys();
  const subject =
    original.match(/^VAPID_SUBJECT=(.+)$/m)?.[1]?.trim() ||
    "mailto:nguyentruongky33@gmail.com";
  original = original.replace(
    /^VAPID_(PUBLIC_KEY|PRIVATE_KEY|SUBJECT)=.*\n?/gm,
    "",
  );
  await writeFile(
    path,
    original.trimEnd() +
      "\n\nVAPID_PUBLIC_KEY=" +
      publicKey +
      "\nVAPID_PRIVATE_KEY=" +
      privateKey +
      "\nVAPID_SUBJECT=" +
      subject +
      "\n",
    { mode: 0o600 },
  );
  await chmod(path, 0o600);
  console.log(
    "Generated VAPID credentials in apps/web-admin/.env.local. No private keys were printed.",
  );
}
