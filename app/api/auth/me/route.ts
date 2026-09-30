import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ user: null });
  try {
    const session = await requireUser(request, response);
    if (!session) return response;
    return NextResponse.json({ user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || [session.user.user_metadata?.first_name, session.user.user_metadata?.last_name].filter(Boolean).join(" ") || session.user.email?.split("@")[0] || "User",
      firstName: session.user.user_metadata?.first_name,
      lastName: session.user.user_metadata?.last_name,
      phone: session.user.user_metadata?.phone,
      address: session.user.user_metadata?.address,
      country: session.user.user_metadata?.country,
      createdAt: session.user.created_at,
      lastSignInAt: session.user.last_sign_in_at,
    } }, { headers: response.headers });
  } catch {
    return response;
  }
}
