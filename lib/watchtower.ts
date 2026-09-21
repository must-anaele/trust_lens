// TrustLens · watchtower — the AI Watchtower.
// Classifies one on-chain event by trust impact → structured verdict + human alert.
// Requires ANTHROPIC_API_KEY (server-side).

import Anthropic from "@anthropic-ai/sdk";
import type { Standard, TransferEvent, Verdict } from "./types";
import { SPECS } from "./standards";

const MODEL = "claude-haiku-4-5";

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

function buildSystem(standard: Standard, chainName: string): string {
  const nft = standard !== "erc20";
  return `You are the TrustLens Watchtower. Classify a single on-chain event on a ${SPECS[standard].label} \
on ${chainName} by how much it threatens holder trust, then write a short human alert. \
${nft
    ? "Mint/reveal of new NFTs, metadata/royalty changes, and high-value token transfers matter most."
    : "Owner/mint/pause/fee/blacklist changes and large treasury movements matter most."} \
Calm and specific — no alarmism, no false reassurance.`;
}

export async function classifyEvent(
  event: TransferEvent,
  standard: Standard,
  chainName: string,
  supply?: number | null,
): Promise<Verdict> {
  const client = new Anthropic();
  const ctx = supply ? `\nToken total supply for context: ${supply}` : "";
  // output_config (structured outputs) may be newer than the installed SDK types — cast.
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystem(standard, chainName),
    messages: [
      {
        role: "user",
        content: "Classify this on-chain event:\n" + JSON.stringify(event, null, 2) + ctx,
      },
    ],
    output_config: { format: { type: "json_schema", schema: VERDICT_SCHEMA } },
  } as any);

  const textBlock = resp.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  return JSON.parse(textBlock!.text) as Verdict;
}
