import { sendNotification } from "web-push";
// A small adapter keeps the real provider mockable without changing ESM exports.
export const pushProvider = { sendNotification };
