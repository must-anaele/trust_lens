// POST /api/analyze  { address, source? }  →  AnalyzeResult
// Server-side only: the Must LiteLLM bearer token never reaches the browser.
// Auto-detects the chain and token standard, then runs the standard-aware pipeline.

import { NextRequest, NextResponse } from "next/server";
import { detectAddress } from "@/lib/detect";
import { collectFacts, scanPowers, recentTransfers } from "@/lib/collect";
import { assess } from "@/lib/assess";
import type { AnalyzeResult, Verdict } from "@/lib/types";
import { hasAiProviderConfig } from "@/lib/responses-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // long enough for the multi-chain probe + AI audit

// No third-party scanner claims ship by default — claims must be per-token
// fixtures tied to a verified scanner result, never generic. The AI prompt
// already handles the empty case ("(none)").

export async function POST(req: NextRequest) {
  let address = "";
  let source: string | undefined;
  let language: "en" | "ko" = "en";
  try {
    const body = await req.json();
    address = (body.address ?? "").trim();
    source = body.source ? String(body.source) : undefined;
    language = body.language === "ko" ? "ko" : "en";
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "Enter a valid contract address (0x + 40 hex chars)." },
      { status: 400 },
    );
  }

  // Auto-detect: which chain does this contract live on, and which standard is it?
  const detection = await detectAddress(address);
  if (!detection.chosen) {
    return NextResponse.json(
      {
        error: detection.reachable
          ? "No token contract found at this address on any supported chain (Polygon, Ethereum, Base, Arbitrum, Optimism, BNB Chain). Double-check the address."
          : "Couldn't reach any supported chain to verify this address. Please try again in a moment.",
      },
      { status: detection.reachable ? 422 : 502 },
    );
  }

  const { config, chain, standard } = detection.chosen;
  const facts = await collectFacts(config, chain, standard, address);
  const ownerRenounced = facts.owner.toLowerCase() === "0x" + "0".repeat(40);
  const powers = await scanPowers(config, standard, address, ownerRenounced, facts.is_proxy);
  const assessment = assess(facts, powers);
  const events = await recentTransfers(config, standard, address, facts.decimals ?? undefined);

  const hasAiProvider = hasAiProviderConfig();
  let report: string | null = null;
  let alerts: Verdict[] | null = null;
  let aiError: string | null = null;

  if (hasAiProvider) {
    try {
      const { audit } = await import("@/lib/audit");
      const { classifyEvent } = await import("@/lib/watchtower");
      report = await audit(facts, [], source, language);
      alerts = events.length
        ? await Promise.all(
            events.map((e) => classifyEvent(e, standard, chain.name, facts.total_supply ?? null, language)),
          )
        : null;
    } catch (e) {
      aiError = e instanceof Error ? e.message : String(e);
    }
  }

  const result: AnalyzeResult = {
    facts, powers, assessment, events, report, alerts, aiError, hasAiProvider,
    alsoFoundOn: detection.alsoFoundOn,
  };
  return NextResponse.json(result);
}
