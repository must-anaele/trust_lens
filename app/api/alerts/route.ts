import { NextRequest, NextResponse } from "next/server";
import { requireUser, supabaseRestUrl, supabaseServiceHeaders } from "@/lib/user-auth";

const conditions = ["price_above", "price_below", "change_above", "change_below"] as const;

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ error: "Sign in to manage alerts." }, { status: 401 });
  try {
    const session = await requireUser(request, response);
    if (!session) return response;
    const userId = encodeURIComponent(session.user.id);
    const [alertsResponse, eventsResponse] = await Promise.all([
      fetch(supabaseRestUrl("trustlens_price_alerts", `select=id,cmc_id,condition,threshold,is_active,created_at&user_id=eq.${userId}&order=created_at.desc`), { headers: supabaseServiceHeaders(), cache: "no-store" }),
      fetch(supabaseRestUrl("trustlens_price_alert_events", `select=id,cmc_id,condition,threshold,observed_value,created_at&user_id=eq.${userId}&order=created_at.desc&limit=30`), { headers: supabaseServiceHeaders(), cache: "no-store" }),
    ]);
    if (!alertsResponse.ok || !eventsResponse.ok) throw new Error("Could not load alerts.");
    return NextResponse.json({ alerts: await alertsResponse.json(), events: await eventsResponse.json() }, { headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load alerts." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ error: "Sign in to create alerts." }, { status: 401 });
  try {
    const session = await requireUser(request, response);
    if (!session) return response;
    const body = await request.json();
    const cmcId = Number(body.cmcId);
    const threshold = Number(body.threshold);
    const condition = body.condition;
    if (!Number.isSafeInteger(cmcId) || cmcId <= 0 || !conditions.includes(condition) || !Number.isFinite(threshold) || threshold <= 0 || threshold > 1e15) {
      return NextResponse.json({ error: "Choose a valid token, alert condition, and positive threshold." }, { status: 400 });
    }
    const result = await fetch(supabaseRestUrl("trustlens_price_alerts"), {
      method: "POST", headers: supabaseServiceHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify({ user_id: session.user.id, cmc_id: cmcId, condition, threshold }), cache: "no-store",
    });
    if (!result.ok) throw new Error("Could not create this alert.");
    return NextResponse.json({ alert: (await result.json())[0] }, { status: 201, headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create alert." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ error: "Sign in to update alerts." }, { status: 401 });
  try {
    const session = await requireUser(request, response);
    if (!session) return response;
    const id = request.nextUrl.searchParams.get("id") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid alert id." }, { status: 400 });
    const result = await fetch(supabaseRestUrl("trustlens_price_alerts", `id=eq.${id}&user_id=eq.${encodeURIComponent(session.user.id)}`), {
      method: "DELETE", headers: supabaseServiceHeaders(), cache: "no-store",
    });
    if (!result.ok) throw new Error("Could not delete this alert.");
    return NextResponse.json({ ok: true }, { headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete alert." }, { status: 503 });
  }
}
