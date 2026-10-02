import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ user: null });
  try {
    const session = await requireUser(request, response);
    if (!session) return response;
    const metadata = session.user.user_metadata;
    const firstName = metadata?.first_name || metadata?.firstName;
    const lastName = metadata?.last_name || metadata?.lastName;
    return NextResponse.json({ user: {
      id: session.user.id,
      email: session.user.email,
      name: metadata?.full_name || metadata?.name || [firstName, lastName].filter(Boolean).join(" ") || session.user.email?.split("@")[0] || "User",
      firstName,
      lastName,
      phone: metadata?.phone || metadata?.phone_number,
      address: metadata?.address || metadata?.street_address,
      country: metadata?.country || metadata?.country_name,
      createdAt: session.user.created_at,
      lastSignInAt: session.user.last_sign_in_at,
    } }, { headers: response.headers });
  } catch {
    return response;
  }
}
