import { publicCredentialHash } from "./credentials";
export function publicConnectionAccess(sessionId: string, admissionId: string) {
  return {
    admissionId,
    token: publicCredentialHash("connection", `${sessionId}:${admissionId}`),
  };
}
