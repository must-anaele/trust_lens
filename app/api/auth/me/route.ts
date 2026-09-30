import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/user-auth";

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ user: null });
  try {
    const session = await requireUser(request, response);
    if (!session) return response;
    return NextResponse.json({ user: { id: session.user.id, email: session.user.email } }, { headers: response.headers });
  } catch {
    return response;
  }
}
