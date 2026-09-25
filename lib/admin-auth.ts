import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "trustlens_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;

function requiredSecrets() {
  const password = process.env.TRUSTLENS_ADMIN_PASSWORD;
  const secret = process.env.TRUSTLENS_ADMIN_SESSION_SECRET;
  if (!password || password.length < 16) throw new Error("Configure TRUSTLENS_ADMIN_PASSWORD with at least 16 characters.");
  if (!secret || secret.length < 32) throw new Error("Configure TRUSTLENS_ADMIN_SESSION_SECRET with at least 32 characters.");
  return { password, secret };
}

function safeEqualText(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export function verifyAdminPassword(candidate: string) {
  const { password } = requiredSecrets();
  return safeEqualText(candidate, password);
}

export function createAdminSession() {
  const { secret } = requiredSecrets();
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signature = createHmac("sha256", secret).update(String(expires)).digest("hex");
  return { value: `${expires}.${signature}`, maxAge: SESSION_SECONDS };
}

export async function hasAdminSession() {
  const { secret } = requiredSecrets();
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const [expiresText, signature, extra] = value.split(".");
  if (!expiresText || !signature || extra || !/^\d+$/.test(expiresText) || !/^[a-f\d]{64}$/i.test(signature)) return false;
  const expires = Number(expiresText);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_SECONDS + 60) return false;
  const expected = createHmac("sha256", secret).update(expiresText).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(expected, received);
}

export function adminSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
