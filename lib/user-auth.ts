import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "trustlens_access";
const REFRESH_COOKIE = "trustlens_refresh";
const COOKIE_AGE = 60 * 60 * 24 * 30;

export type AuthUser = {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  user_metadata?: { full_name?: string; name?: string; first_name?: string; last_name?: string; phone?: string; address?: string; country?: string };
};

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Account sign-in is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
  return { url, key };
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string, expiresIn = 3600) {
  response.cookies.set(ACCESS_COOKIE, accessToken, cookieOptions(Math.min(COOKIE_AGE, expiresIn)));
  response.cookies.set(REFRESH_COOKIE, refreshToken, cookieOptions(COOKIE_AGE));
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
}

export async function authRequest(path: string, body: unknown) {
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST", headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.msg === "string" ? data.msg : typeof data.message === "string" ? data.message : "Sign-in request failed.";
    throw new Error(message);
  }
  return data as { access_token?: string; refresh_token?: string; expires_in?: number; user?: AuthUser };
}

async function resolveUser(accessToken: string) {
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` }, cache: "no-store",
  });
  if (!response.ok) return null;
  return await response.json() as AuthUser;
}

export async function requireUser(request: NextRequest, response: NextResponse) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (access) {
    const user = await resolveUser(access);
    if (user) return { user, accessToken: access };
  }
  if (!refresh) return null;
  try {
    const data = await authRequest("token?grant_type=refresh_token", { refresh_token: refresh });
    if (!data.access_token || !data.refresh_token) return null;
    setAuthCookies(response, data.access_token, data.refresh_token, data.expires_in);
    const user = data.user ?? await resolveUser(data.access_token);
    return user ? { user, accessToken: data.access_token } : null;
  } catch {
    return null;
  }
}

export function supabaseServiceHeaders(extra: Record<string, string> = {}) {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Watchlist storage is not configured. Set SUPABASE_SECRET_KEY on the server.");
  // New sb_secret keys belong in apikey only; legacy service_role JWTs also supply the bearer role.
  return { apikey: key, ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }), "Content-Type": "application/json", ...extra };
}

export function supabaseRestUrl(table: string, query = "") {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  if (!url) throw new Error("Watchlist storage is not configured. Set SUPABASE_URL on the server.");
  return `${url}/rest/v1/${table}${query ? `?${query}` : ""}`;
}
