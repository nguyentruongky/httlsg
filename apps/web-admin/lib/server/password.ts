import { hash, verify, argon2id } from "argon2";
export const hashPassword = (password: string) =>
  hash(password, {
    type: argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
export async function verifyPassword(encoded: string, password: string) {
  try {
    return await verify(encoded, password);
  } catch {
    return false;
  }
}
// Unknown emails receive the same expensive password verification path.
let dummy: Promise<string> | undefined;
export function dummyHash() {
  return (dummy ??= hashPassword("not-a-login-account-50e90879-8375-405e"));
}
