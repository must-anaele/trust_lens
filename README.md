# TrustLens — Next.js + TypeScript

**An AI trust-verification web app for ERC-20 tokens.** Paste any token address → TrustLens
reads the live chain, and (with an API key) has Claude write a plain-English **Trust Report**
and triage recent on-chain events. Built on Next.js (App Router) + TypeScript + `@anthropic-ai/sdk`
(`claude-opus-4-8`).

Week-1 PIP deliverable (Nnaemeka Anaele). Selected problem: *anyone evaluating a token cannot
quickly or continuously verify what the contract can do, or whether anything dangerous is
happening.* See `../SUT-Solution-AI-Plan.md`.

## Architecture

```
Browser (app/page.tsx)
   │  POST /api/analyze { address, source? }
   ▼
Server route (app/api/analyze/route.ts)   ← the Anthropic key lives here, never in the browser
   ├─ lib/collect.ts     on-chain facts + recent Transfer events (public RPC, no key)
   ├─ lib/audit.ts       AI Auditor — writes the Trust Report, reconciles scanner-vs-chain
   └─ lib/watchtower.ts  AI Watchtower — classifies each event → severity + alert (structured output)
```

| File | Role |
|---|---|
| `app/page.tsx` | Client dashboard: address input, optional source, renders facts + report + alerts |
| `app/api/analyze/route.ts` | Server pipeline: collect → (audit + watchtower) → JSON |
| `lib/collect.ts` | JSON-RPC to Polygon: facts + recent transfers (no key) |
| `lib/audit.ts` | Anthropic audit (adaptive thinking, streamed under the hood) |
| `lib/watchtower.ts` | Anthropic event classifier (structured outputs) |
| `lib/types.ts` | Shared types |

## Run it

```bash
cd trustlens-next
npm install

# optional but recommended — enables the AI report + event triage:
cp .env.example .env.local
# edit .env.local and paste your key after ANTHROPIC_API_KEY=

npm run dev
# open http://localhost:3000, paste a token address (defaults to SUT), click Analyze
```

Production build:

```bash
npm run build && npm start
```

## Behaviour

- **No key:** returns verified on-chain facts + recent events; the AI report/alerts are skipped
  (the page says so). The trust claim itself stays independently verifiable — the point of the product.
- **With key:** Claude writes the Trust Report and triages events. The key is read **server-side
  only** (`process.env.ANTHROPIC_API_KEY`) and never sent to the browser.
- **Optional verified source:** paste it in the UI. Without it the Auditor reports privileged-function
  status as **UNRESOLVED** rather than guessing; with it, the verdict becomes **VERIFIED** or
  **CONFIRMED-RISK**.
- **Resilient:** an API error (quota, rate limit, network) doesn't break the page — facts still render,
  with a clear note.

## AI vs. human judgment

- **AI does:** read code + chain, explain risk in plain English, reconcile conflicting sources,
  triage and explain events.
- **A human owns:** verifying facts on-chain, signing off on severity, deciding what the Watchtower
  monitors, and — the one thing AI cannot do — **deploying the contract fix** if a real power exists.

## API correctness

Follows the current Anthropic reference: model `claude-opus-4-8`, **adaptive thinking** for the
audit, **`messages.stream()` + `finalMessage()`** for the long report, **structured outputs**
(`output_config.format`) for the Watchtower classifier.

*Not investment advice. On-chain data is point-in-time and should be re-pulled at use.*
# trust_lens
# trust_lens
# trust_lens
