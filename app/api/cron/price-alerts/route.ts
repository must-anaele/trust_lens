import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getQuotesById } from "@/lib/market-data";
import { supabaseRestUrl, supabaseServiceHeaders } from "@/lib/user-auth";

type Alert = { id: string; user_id: string; cmc_id: number; condition: string; threshold: number; last_value: number | null; is_active: boolean };

function authorized(request: NextRequest) {
  const expected = process.env.TRUSTLENS_ALERT_CRON_SECRET;
  if (!expected) return false;
  const candidate = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return timingSafeEqual(createHash("sha256").update(expected).digest(), createHash("sha256").update(candidate).digest());
}

function hit(condition: string, value: number, threshold: number) {
  return condition === "price_above" ? value >= threshold
    : condition === "price_below" ? value <= threshold
      : condition === "change_above" ? value >= threshold : value <= -threshold;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Monitoring authorization required." }, { status: 401 });
  try {
    const response = await fetch(supabaseRestUrl("trustlens_price_alerts", "select=id,user_id,cmc_id,condition,threshold,last_value,is_active&is_active=eq.true&limit=500"), { headers: supabaseServiceHeaders(), cache: "no-store" });
    if (!response.ok) throw new Error("Could not load alerts.");
    const alerts = await response.json() as Alert[];
    const coins = await getQuotesById([...new Set(alerts.map((a) => a.cmc_id))]);
    const byId = new Map(coins.map((coin) => [coin.id, coin]));
    let triggered = 0;
    for (const alert of alerts) {
      const coin = byId.get(alert.cmc_id);
      if (!coin) continue;
      const observed = alert.condition.startsWith("price_") ? coin.price : coin.change24h;
      const nowHit = hit(alert.condition, observed, alert.threshold);
      const previouslyHit = alert.last_value !== null && hit(alert.condition, alert.last_value, alert.threshold);
      if (nowHit && !previouslyHit) {
        const saved = await fetch(supabaseRestUrl("trustlens_price_alert_events"), {
          method: "POST", headers: supabaseServiceHeaders({ Prefer: "return=minimal" }),
          body: JSON.stringify({ user_id: alert.user_id, alert_id: alert.id, cmc_id: coin.id, condition: alert.condition, threshold: alert.threshold, observed_value: observed }), cache: "no-store",
        });
        if (saved.ok) triggered++;
      }
      await fetch(supabaseRestUrl("trustlens_price_alerts", `id=eq.${alert.id}`), {
        method: "PATCH", headers: supabaseServiceHeaders({ Prefer: "return=minimal" }), body: JSON.stringify({ last_value: observed }), cache: "no-store",
      });
    }
    return NextResponse.json({ checked: alerts.length, triggered });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Alert check failed." }, { status: 503 });
  }
}
