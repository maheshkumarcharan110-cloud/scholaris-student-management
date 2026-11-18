import crypto from "node:crypto";

/** Generates a high-entropy, URL-safe token. Only the hash is stored. */
export function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function tokenExpiry(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export const TOKEN_TTL = {
  emailVerification: 24 * 60,
  passwordReset: 60,
  emailChange: 60,
};
