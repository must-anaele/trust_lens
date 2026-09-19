// TrustLens · watchtower — the AI Watchtower.
// Classifies one on-chain event by trust impact → structured verdict + human alert.
// Requires ANTHROPIC_API_KEY (server-side).

import Anthropic from "@anthropic-ai/sdk";
import type { TransferEvent, Verdict } from "./types";

const MODEL = "claude-opus-4-8";

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

const SYSTEM = `You are the TrustLens Watchtower. Classify a single on-chain event on an ERC-20 token by \
how much it threatens holder trust, then write a short human alert. Owner/mint/pause/fee/blacklist \
changes and large treasury movements matter most. Calm and specific — no alarmism, no false reassurance.`;

export async function classifyEvent(
  event: TransferEvent,
  supply?: number | null,
): Promise<Verdict> {
  const client = new Anthropic();
  const ctx = supply ? `\nToken total supply for context: ${supply}` : "";
  // output_config (structured outputs) may be newer than the installed SDK types — cast.
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
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
