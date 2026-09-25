import { assess } from "@/lib/assess";
import { collectFacts, recentTransfers, scanPowers } from "@/lib/collect";
import { detectAddress } from "@/lib/detect";
import { hasAiProviderConfig } from "@/lib/anthropic-client";
import type { AnalyzeResult, Verdict } from "@/lib/types";

export class AnalysisError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function runContractAnalysis(address: string, requestedChainId?: number, language: "en" | "ko" = "en", source?: string): Promise<AnalyzeResult> {
  const detection = await detectAddress(address, requestedChainId);
  if (!detection.chosen) {
    if (!detection.reachable) throw new AnalysisError("Couldn't reach the selected supported chain to verify this address. Please try again in a moment.", 502);
    throw new AnalysisError(
      requestedChainId !== undefined
        ? "No recognized token contract found at this address on the selected network. Confirm the address and network."
        : "No token contract found at this address on any supported chain (Polygon, Ethereum, Base, Arbitrum, Optimism, BNB Chain). Double-check the address.",
      422,
    );
  }

  const { config, chain, standard } = detection.chosen;
  const facts = await collectFacts(config, chain, standard, address);
  const powers = await scanPowers(config, standard, address, facts.owner.toLowerCase() === `0x${"0".repeat(40)}`, facts.is_proxy);
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
        ? await Promise.all(events.map((event) => classifyEvent(event, standard, chain.name, facts.total_supply ?? null, language)))
        : null;
    } catch (error) {
      aiError = error instanceof Error ? error.message : String(error);
    }
  }

  return { facts, powers, assessment, events, report, alerts, aiError, hasAiProvider, alsoFoundOn: detection.alsoFoundOn };
}
