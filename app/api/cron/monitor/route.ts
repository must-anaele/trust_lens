import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { assess } from "@/lib/assess";
import { chainById, toChainInfo } from "@/lib/chains";
import { collectFacts, scanPowers } from "@/lib/collect";
import { insertMonitorEvent, listApprovedReviews, listMonitorSnapshots, saveMonitorSnapshot } from "@/lib/review-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(request: NextRequest) {
  const secret = process.env.TRUSTLENS_MONITOR_CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const candidate = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = createHash("sha256").update(secret).digest();
  const b = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(a, b);
}

function snapshotOf(facts: Awaited<ReturnType<typeof collectFacts>>, powers: Awaited<ReturnType<typeof scanPowers>>, assessment: ReturnType<typeof assess>) {
  return {
    name: facts.name,
    symbol: facts.symbol,
    owner: facts.owner,
    owner_kind: facts.owner_kind,
    paused: facts.paused,
    is_proxy: facts.is_proxy,
    proxy_implementation: facts.proxy_implementation,
    proxy_admin: facts.proxy_admin,
    bytecode_bytes: facts.bytecode_bytes,
    total_supply_raw: facts.total_supply_raw ?? null,
    privileged_surfaces: [...powers.present].sort(),
    owner_renounced: powers.owner_renounced,
    pause_callable: powers.pause_callable,
    assessment_status: assessment.status,
  };
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Monitoring authorization required." }, { status: 401 });
  try {
    const reviews = await listApprovedReviews();
    const latestByContract = new Map<string, typeof reviews[number]>();
    for (const review of reviews) {
      const key = `${review.chain_id}:${review.address.toLowerCase()}`;
      if (!latestByContract.has(key)) latestByContract.set(key, review);
    }
    const snapshots = await listMonitorSnapshots();
    const byId = new Map(snapshots.map((snapshot) => [snapshot.review_id, snapshot]));
    const candidates = [...latestByContract.values()].sort((a, b) => {
      const at = byId.get(a.id)?.checked_at;
      const bt = byId.get(b.id)?.checked_at;
      return (at ? Date.parse(at) : 0) - (bt ? Date.parse(bt) : 0);
    }).slice(0, 10);

    let processed = 0;
    let changesFound = 0;
    const failures: Array<{ reviewId: string; message: string }> = [];
    for (const review of candidates) {
      const config = chainById(review.chain_id);
      if (!config) { failures.push({ reviewId: review.id, message: "Unsupported network." }); continue; }
      try {
        const facts = await collectFacts(config, toChainInfo(config), review.result.facts.standard, review.address);
        const powers = await scanPowers(config, review.result.facts.standard, review.address, facts.owner.toLowerCase() === `0x${"0".repeat(40)}`, facts.is_proxy);
        const assessment = assess(facts, powers);
        const current = snapshotOf(facts, powers, assessment);
        const prior = byId.get(review.id);
        if (prior) {
          for (const key of Object.keys(current)) {
            const before = prior.snapshot[key];
            const after = current[key as keyof typeof current];
            if (JSON.stringify(before) === JSON.stringify(after)) continue;
            await insertMonitorEvent({
              review_id: review.id, asset_slug: review.asset_slug, address: review.address,
              chain_id: review.chain_id, change_type: key, before_value: before ?? null, after_value: after,
            });
            changesFound++;
          }
        }
        await saveMonitorSnapshot({ review_id: review.id, address: review.address, chain_id: review.chain_id, snapshot: current });
        processed++;
      } catch (error) {
        failures.push({ reviewId: review.id, message: error instanceof Error ? error.message.slice(0, 240) : "Chain read failed." });
      }
    }
    return NextResponse.json({ processed, changesFound, candidatesRemaining: Math.max(0, latestByContract.size - candidates.length), failures }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Monitoring run failed. Check review storage and RPC availability." }, { status: 503 });
  }
}
