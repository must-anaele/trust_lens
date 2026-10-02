import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/user-auth";

const fields = {
  firstName: { key: "first_name", max: 80 },
  lastName: { key: "last_name", max: 80 },
  phone: { key: "phone", max: 30 },
  address: { key: "address", max: 300 },
  country: { key: "country", max: 100 },
} as const;

export async function PATCH(request: NextRequest) {
  const cookieResponse = NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const session = await requireUser(request, cookieResponse);
    if (!session) return cookieResponse;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: cookieResponse.headers });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid profile data." }, { status: 400, headers: cookieResponse.headers });
    }
    const input = body as Record<string, unknown>;
    const metadata: Record<string, string> = {};
    for (const [field, config] of Object.entries(fields)) {
      if (!(field in input)) continue;
      if (typeof input[field] !== "string") {
        return NextResponse.json({ error: "Profile fields must be text." }, { status: 400, headers: cookieResponse.headers });
      }
      metadata[config.key] = (input[field] as string).trim().slice(0, config.max);
    }
    if (Object.keys(metadata).length !== Object.keys(fields).length) {
      return NextResponse.json({ error: "Submit all profile fields." }, { status: 400, headers: cookieResponse.headers });
    }
    const firstName = metadata.first_name;
    const lastName = metadata.last_name;
    if (!firstName || !lastName || !metadata.phone || !metadata.country) {
      return NextResponse.json({ error: "First name, last name, phone, and country are required." }, { status: 400, headers: cookieResponse.headers });
    }

    const baseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!baseUrl || !apiKey) throw new Error("Account updates are not configured.");

    const response = await fetch(`${baseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { ...session.user.user_metadata, ...metadata, full_name: `${firstName} ${lastName}`.trim() } }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof result.msg === "string" ? result.msg : typeof result.message === "string" ? result.message : "Could not update your profile.";
      return NextResponse.json({ error: message }, { status: response.status, headers: cookieResponse.headers });
    }
    return NextResponse.json({ ok: true }, { headers: cookieResponse.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update your profile." }, { status: 500, headers: cookieResponse.headers });
  }
}
