import { NextRequest, NextResponse } from "next/server";
import { authRequest } from "@/lib/user-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: "Enter a valid email and a password with at least 10 characters." }, { status: 400 });
    }
    await authRequest("signup", { email, password });
    return NextResponse.json({ message: "Check your email for a confirmation link, then sign in." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Account creation failed." }, { status: 400 });
  }
}
