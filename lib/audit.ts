// TrustLens · audit — the AI Auditor & Explainer.
// Reads on-chain facts + scanner claims + (optional) verified source → plain-English
// Trust Report, reconciling scanner-vs-chain. Requires ANTHROPIC_API_KEY (server-side).

import Anthropic from "@anthropic-ai/sdk";
import type { Facts } from "./types";

const MODEL = "claude-opus-4-8";

const SYSTEM = `You are TrustLens, a smart-contract trust auditor for ERC-20 tokens. Turn raw on-chain \
facts, third-party scanner claims, and (when available) verified Solidity source into a short, \
plain-English Trust Report a non-engineer can act on.

Hard rules:
- Separate VERIFIED on-chain facts from UNVERIFIED third-party claims. Never present a scanner claim as fact.
- When scanner and chain disagree, say so and explain the possible reasons, then name the single piece of evidence that resolves it.
- Without the verified source, do NOT guess whether a privileged function exists — say the status is UNRESOLVED and name exactly what to fetch.
- Never overstate safety. "No active owner detected" is not "safe".
- Be concise. Lead with a one-line verdict readable in five seconds.`;

function buildPrompt(facts: Facts, claims: string[], source?: string): string {
  return `Produce a Trust Report for this token.

## Confirmed on-chain facts (VERIFIED this run)
${JSON.stringify(facts, null, 2)}

## Third-party scanner claims (UNVERIFIED)
${claims.length ? claims.map((c) => `- ${c}`).join("\n") : "- (none)"}

## Verified Solidity source
${source ? source.slice(0, 60000) : "(NOT PROVIDED — verified source not yet fetched)"}

Sections:
1. **Verdict** — one line, plain English.
2. **What the contract can do** — powers in plain English (or "unresolved — need source").
3. **Scanner vs. chain** — reconcile; name the one evidence item that resolves it.
4. **What a buyer should check** — max 3 bullets.
5. **Status** — VERIFIED-SAFE-ish / UNRESOLVED-NEEDS-SOURCE / CONFIRMED-RISK + one sentence why.`;
}

export async function audit(
  facts: Facts,
  claims: string[],
  source?: string,
): Promise<string> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  // Stream under the hood (robust for long output), return the finished text.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(facts, claims, source) }],
  });
  const final = await stream.finalMessage();
  return final.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
