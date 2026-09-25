// TrustLens · audit — the AI Auditor & Explainer, using Anthropic's Messages API.
import type { Facts } from "./types";
import { SPECS } from "./standards";
import { generateText } from "./anthropic-client";

function buildSystem(facts: Facts, language: "en" | "ko"): string {
  const spec = SPECS[facts.standard];
  const nft = facts.standard !== "erc20";
  return `You are TrustLens, a smart-contract trust auditor for ${spec.label}s on ${facts.chain.name}. \
Turn raw on-chain facts, third-party scanner claims, and (when available) verified Solidity source \
into a short, plain-language Trust Report a non-engineer can act on.
${language === "ko" ? "Write the entire report in natural Korean. Keep technical identifiers, function names, standards, and addresses unchanged." : "Write the entire report in English."}

Hard rules:
- Separate VERIFIED on-chain facts from UNVERIFIED third-party claims. Never present a scanner claim as fact.
- When scanner and chain disagree, say so and explain the possible reasons, then name the single piece of evidence that resolves it.
- Without the verified source, do NOT guess whether a privileged function exists — say the status is UNRESOLVED and name exactly what to fetch.
- Never overstate safety. "No active owner detected" is not "safe".
- Be concise. Lead with a one-line verdict readable in five seconds.
${nft ? "- For NFTs: focus on mint controls, metadata mutability, and royalties — not token supply or fees." : ""}`;
}

function buildPrompt(facts: Facts, claims: string[], source?: string, language: "en" | "ko" = "en"): string {
  const nft = facts.standard !== "erc20";
  return `Produce a Trust Report for this ${SPECS[facts.standard].label} on ${facts.chain.name}.

## Confirmed on-chain facts (VERIFIED this run)
${JSON.stringify(facts, null, 2)}

## Third-party scanner claims (UNVERIFIED)
${claims.length ? claims.map((c) => `- ${c}`).join("\n") : "- (none)"}

## Verified Solidity source
${source ? source.slice(0, 60000) : "(NOT PROVIDED — verified source not yet fetched)"}

${language === "ko" ? "Write all headings and explanations in Korean, while preserving technical terms and quoted evidence." : "Write all headings and explanations in English."}

Sections:
1. **Verdict** — one line, plain English.
2. **What the contract can do** — powers in plain English (or "unresolved — need source").
3. **Scanner vs. chain** — reconcile; name the one evidence item that resolves it.
4. **What a buyer should check** — max 3 bullets.
5. **Status** — VERIFIED-SAFE-ish / UNRESOLVED-NEEDS-SOURCE / CONFIRMED-RISK + one sentence why.
${nft ? "For an NFT standard, interpret 'supply' as collection/mint controls and 'fees' as royalties/metadata mutability." : ""}`;
}

export async function audit(
  facts: Facts,
  claims: string[],
  source?: string,
  language: "en" | "ko" = "en",
): Promise<string> {
  return generateText({
    instructions: buildSystem(facts, language),
    input: buildPrompt(facts, claims, source, language),
    maxOutputTokens: 8000,
  });
}
