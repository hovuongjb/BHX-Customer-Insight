import crypto from "node:crypto";

/** Random, non-sequential, unguessable token used in the public survey QR URL. */
export function generateQrToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
