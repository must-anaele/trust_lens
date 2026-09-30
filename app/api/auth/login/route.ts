import { NextRequest, NextResponse } from "next/server";
import { authRequest, setAuthCookies } from "@/lib/user-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || password.length > 128) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    const data = await authRequest("token?grant_type=password", { email, password });
    if (!data.access_token || !data.refresh_token || !data.user) return NextResponse.json({ error: "Sign-in failed." }, { status: 401 });
    const response = NextResponse.json({ user: { id: data.user.id, email: data.user.email } });
    setAuthCookies(response, data.access_token, data.refresh_token, data.expires_in);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sign-in failed." }, { status: 401 });
  }
}
