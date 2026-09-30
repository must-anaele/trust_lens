import { NextRequest, NextResponse } from "next/server";
import { authRequest } from "@/lib/user-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const firstName = typeof body.firstName === "string" ? body.firstName.trim().slice(0, 80) : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim().slice(0, 80) : "";
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "";
    const address = typeof body.address === "string" ? body.address.trim().slice(0, 300) : "";
    const country = typeof body.country === "string" ? body.country.trim().slice(0, 100) : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !firstName || !lastName || !phone || !address || !country || password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: "Complete all profile fields, enter a valid email, and use a password with at least 10 characters." }, { status: 400 });
    }
    await authRequest("signup", {
      email,
      password,
      data: { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`, phone, address, country },
    });
    return NextResponse.json({ message: "Check your email for a confirmation link, then sign in." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Account creation failed." }, { status: 400 });
  }
}
