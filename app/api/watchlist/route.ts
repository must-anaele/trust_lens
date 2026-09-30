import { NextRequest, NextResponse } from "next/server";
import { requireUser, supabaseRestUrl, supabaseServiceHeaders } from "@/lib/user-auth";

type Favorite = { cmc_id: number; created_at: string };

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ error: "Sign in to view your watchlist." }, { status: 401 });
  try {
    const session = await requireUser(request, response);
    if (!session) return response;
    const url = supabaseRestUrl("trustlens_watchlist", `select=cmc_id,created_at&user_id=eq.${encodeURIComponent(session.user.id)}&order=created_at.desc`);
    const result = await fetch(url, { headers: supabaseServiceHeaders(), cache: "no-store" });
    if (!result.ok) throw new Error("Could not load the saved watchlist.");
    const favorites = await result.json() as Favorite[];
    return NextResponse.json({ favorites }, { headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load the watchlist." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ error: "Sign in to save favorites." }, { status: 401 });
  try {
    const session = await requireUser(request, response);
    if (!session) return response;
    const body = await request.json();
    const cmcId = Number(body.cmcId);
    if (!Number.isSafeInteger(cmcId) || cmcId <= 0) return NextResponse.json({ error: "Invalid coin id." }, { status: 400 });
    const result = await fetch(supabaseRestUrl("trustlens_watchlist"), {
      method: "POST", headers: supabaseServiceHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
      body: JSON.stringify({ user_id: session.user.id, cmc_id: cmcId }), cache: "no-store",
    });
    if (!result.ok) throw new Error("Could not save this favorite.");
    return NextResponse.json({ ok: true }, { headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save this favorite." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ error: "Sign in to update favorites." }, { status: 401 });
  try {
    const session = await requireUser(request, response);
    if (!session) return response;
    const cmcId = Number(request.nextUrl.searchParams.get("cmcId"));
    if (!Number.isSafeInteger(cmcId) || cmcId <= 0) return NextResponse.json({ error: "Invalid coin id." }, { status: 400 });
    const result = await fetch(supabaseRestUrl("trustlens_watchlist", `user_id=eq.${encodeURIComponent(session.user.id)}&cmc_id=eq.${cmcId}`), {
      method: "DELETE", headers: supabaseServiceHeaders(), cache: "no-store",
    });
    if (!result.ok) throw new Error("Could not remove this favorite.");
    return NextResponse.json({ ok: true }, { headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not remove this favorite." }, { status: 503 });
  }
}
