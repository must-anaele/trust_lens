import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminSessionCookieOptions, createAdminSession, hasAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try { return NextResponse.json({ authenticated: await hasAdminSession() }); }
  catch { return NextResponse.json({ error: "Admin login is not configured." }, { status: 503 }); }
}

export async function POST(req: NextRequest) {
  const length = Number(req.headers.get("content-length") || "0");
  if (length > 8_192) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let password = "";
  try {
    const body = await req.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  try {
    if (!verifyAdminPassword(password)) return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    const session = createAdminSession();
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ADMIN_COOKIE, session.value, adminSessionCookieOptions(session.maxAge));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin login is not configured.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE, "", { ...adminSessionCookieOptions(0), expires: new Date(0) });
  return response;
}
