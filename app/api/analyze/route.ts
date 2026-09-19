// POST /api/analyze  { address, source? }  →  AnalyzeResult
// Server-side only: the Anthropic key never reaches the browser.

import { NextRequest, NextResponse } from "next/server";
import { collectFacts, scanPowers, recentTransfers } from "@/lib/collect";
import { assess } from "@/lib/assess";
import type { AnalyzeResult, Verdict } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // long enough for the AI audit

const SUT = "0x98965474ecbec2f532f1f780ee37b0b05f77ca55";
const SUT_CLAIMS = [
  "GoPlus (via CoinGecko): contract owner can disable sells, mint, and change fees.",
  "PolygonScan: a 'UI Multiplier' scales displayed balances vs. true balanceOf.",
  "CoinMarketCap: reported circulating supply differs from on-chain total supply.",
];

export async function POST(req: NextRequest) {
  let address = "";
  let source: string | undefined;
  try {
    const body = await req.json();
    address = (body.address ?? "").trim();
    source = body.source ? String(body.source) : undefined;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "Enter a valid ERC-20 address (0x + 40 hex chars)." },
      { status: 400 },
    );
  }

  const facts = await collectFacts(address);
  const ownerRenounced = facts.owner.toLowerCase() === "0x" + "0".repeat(40);
  const powers = await scanPowers(address, ownerRenounced, facts.is_proxy);
  const assessment = assess(facts, powers);
  const events = await recentTransfers(address, facts.decimals ?? 18);

  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  let report: string | null = null;
  let alerts: Verdict[] | null = null;
  let aiError: string | null = null;

  if (hasKey) {
    try {
      const { audit } = await import("@/lib/audit");
      const { classifyEvent } = await import("@/lib/watchtower");
      const claims = address.toLowerCase() === SUT ? SUT_CLAIMS : [];
      report = await audit(facts, claims, source);
      alerts = events.length
        ? await Promise.all(events.map((e) => classifyEvent(e, facts.total_supply)))
        : null;
    } catch (e) {
      aiError = e instanceof Error ? e.message : String(e);
    }
  }

  const result: AnalyzeResult = { facts, powers, assessment, events, report, alerts, aiError, hasKey };
  return NextResponse.json(result);
}
