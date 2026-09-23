// TrustLens · watchtower — classify a chain event using the Must LiteLLM Responses API.
import type { Standard, TransferEvent, Verdict } from "./types";
import { SPECS } from "./standards";
import { generateText } from "./responses-client";

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["critical", "high", "medium", "info"] },
    emoji: { type: "string", enum: ["🔴", "🟠", "🟡", "🟢"] },
    headline: { type: "string" },
    why_it_matters: { type: "string" },
    recommended_action: { type: "string" },
  },
  required: ["severity", "emoji", "headline", "why_it_matters", "recommended_action"],
  additionalProperties: false,
} as const;

function buildSystem(standard: Standard, chainName: string, language: "en" | "ko"): string {
  const nft = standard !== "erc20";
  return `You are the TrustLens Watchtower. Classify a single on-chain event on a ${SPECS[standard].label} \
on ${chainName} by how much it threatens holder trust, then write a short human alert. \
${nft
    ? "Mint/reveal of new NFTs, metadata/royalty changes, and high-value token transfers matter most."
    : "Owner/mint/pause/fee/blacklist changes and large treasury movements matter most."} \
Calm and specific — no alarmism, no false reassurance. ${language === "ko" ? "Write the headline, explanation, and recommended action in natural Korean. Keep technical identifiers unchanged." : "Write the headline, explanation, and recommended action in English."}`;
}

export async function classifyEvent(
  event: TransferEvent,
  standard: Standard,
  chainName: string,
  supply?: number | null,
  language: "en" | "ko" = "en",
): Promise<Verdict> {
  const ctx = supply ? `\nToken total supply for context: ${supply}` : "";
  const text = await generateText({
    instructions: buildSystem(standard, chainName, language),
    input: "Classify this on-chain event:\n" + JSON.stringify(event, null, 2) + ctx,
    maxOutputTokens: 1024,
    format: { name: "trustlens_event_verdict", schema: VERDICT_SCHEMA },
  });
  return JSON.parse(text) as Verdict;
}
