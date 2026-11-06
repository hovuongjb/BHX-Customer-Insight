import crypto from "node:crypto";
import { env } from "./env";

// Vietnamese mobile numbers: 10 digits starting with 0, valid prefixes per current
// numbering plan (03x, 05x, 07x, 08x, 09x).
const VN_MOBILE_REGEX = /^0(3[2-9]|5[25689]|7[06789]|8[1-9]|9[0-9])\d{7}$/;

/**
 * Normalizes a user-entered Vietnamese phone number to the canonical "0xxxxxxxxx" form.
 * Returns null when the input is not a valid VN mobile number.
 */
export function normalizeVnPhone(raw: string): string | null {
  const digitsOnly = raw.replace(/[\s.\-()]/g, "");
  let candidate = digitsOnly;

  if (candidate.startsWith("+84")) {
    candidate = `0${candidate.slice(3)}`;
  } else if (candidate.startsWith("84") && candidate.length === 11) {
    candidate = `0${candidate.slice(2)}`;
  }

  if (!VN_MOBILE_REGEX.test(candidate)) {
    return null;
  }
  return candidate;
}

/** Keyed hash of the normalized phone number — used only for duplicate detection. */
export function hashPhone(normalizedPhone: string): string {
  return crypto.createHmac("sha256", env.phoneHashSecret).update(normalizedPhone).digest("hex");
}

export function last4(normalizedPhone: string): string {
  return normalizedPhone.slice(-4);
}
