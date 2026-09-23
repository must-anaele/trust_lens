# TrustLens — Next.js + TypeScript

**An AI trust-verification web app for EVM tokens and NFTs.** Paste any contract address →
TrustLens auto-detects the chain and standard (ERC-20 / ERC-721 / ERC-1155 across Polygon,
Ethereum, Base, Arbitrum, Optimism, BNB Chain), reads the live chain, and (when configured)
uses the Must LiteLLM **Responses API** to write a plain-English Trust Report and triage recent
on-chain events. The server-side model alias is configurable (`MUST_LITELLM_MODEL`, default
`codex`). Built on Next.js (App Router) + TypeScript + server-side `fetch`.

The app also includes a consent-based **Wallet Analysis** page at `/wallet-review` for a selected
EVM chain. It reads native balance, account nonce, deployed-code presence, and recent ERC-20
allowances, ERC-721 token approvals, and ERC-721/ERC-1155 operator approvals using public RPC data.
It does not request identity/KYC data, connect a wallet, or sign transactions. The approval review
is limited to the latest 50,000 blocks and supported event patterns; it is not a full wallet audit.

Week-1 PIP deliverable (Nnaemeka Anaele). Selected problem: *anyone evaluating a token cannot
quickly or continuously verify what the contract can do, or whether anything dangerous is
happening.* See `../SUT-Solution-AI-Plan.md`.

## Architecture

```
Browser (app/page.tsx)
   │  POST /api/analyze { address, source? }
   ▼
Server route (app/api/analyze/route.ts)   ← the LiteLLM bearer token stays server-side
   ├─ lib/detect.ts      auto-detect chain + standard (probes all chains in parallel)
   ├─ lib/collect.ts     on-chain facts + recent transfer events (public RPC, no key)
   ├─ lib/assess.ts      deterministic standard-aware reconciliation (no AI)
   ├─ lib/audit.ts       AI Auditor — writes the Trust Report, reconciles scanner-vs-chain
   └─ lib/watchtower.ts  AI Watchtower — classifies each event → severity + alert (structured output)
```

| File | Role |
|---|---|
| `app/page.tsx` | Client dashboard: address input, optional source, renders facts + report + alerts |
| `app/api/analyze/route.ts` | Server pipeline: detect → collect/assess → (audit + watchtower) → JSON |
| `app/api/wallet-review/route.ts` | Consent-gated, chain-specific public wallet-approval scan |
| `lib/wallet.ts` | Reads recent approval events and verifies current approval state via read-only calls |
| `components/wallet-review-tool.tsx` | Wallet analysis form, permission evidence, coverage caveats |
| `components/contract-analysis.tsx` | Contract analyzer and evidence report view |
| `components/landing-sections.tsx` | Product paths, feature summary, method, and trust principles |
| `components/site-chrome.tsx` | Shared header and footer across routes |
| `lib/chains.ts` | Supported chains + generic JSON-RPC failover caller (server-side only) |
| `lib/standards.ts` | Standard detection (ERC-165 + functional probe) + per-standard selector/topic tables |
| `lib/detect.ts` | Multi-chain auto-detect orchestrator; resolves multi-hit by chain priority |
| `lib/collect.ts` | Chain- and standard-aware facts, powers scan, transfer parsing |
| `lib/audit.ts` | Trust report prompt and audit narrative |
| `lib/watchtower.ts` | Event classifier with Responses API JSON Schema output |
| `lib/responses-client.ts` | Server-only Must LiteLLM Responses API client |
| `lib/types.ts` | Shared types (`Facts` carries `chain` + `standard` discriminant) |

## Run it

```bash
cd trustlens-next
npm install

# optional but recommended — enables the AI report + event triage:
cp .env.example .env.local
# replace MUST_LITELLM_API_KEY with a rotated gateway token; confirm MUST_LITELLM_MODEL is the exact alias your gateway serves

npm run dev
# open http://localhost:3000, paste any token/NFT contract address, click Analyze contract
```

Production build:

```bash
npm run build && npm start
```

## Behaviour

- **Auto-detect:** the same address is probed on every supported chain in parallel; the report
  covers the highest-priority chain where a recognized standard was found (Polygon first, so the
  demo token still works), and the UI notes "also found on …" for other chains.
- **No gateway configured:** returns verified on-chain facts + recent events; the AI report/alerts are skipped
  (the page says so). The trust claim itself stays independently verifiable — the point of the product.
- **With gateway configured:** the configured model writes the Trust Report and triages events.
  `MUST_LITELLM_API_KEY` is read server-side only and never sent to the browser. The base URL and
  model alias are configurable through environment variables.
- **Optional verified source:** paste it in the UI. Without it the Auditor reports privileged-function
  status as **UNRESOLVED** rather than guessing; with it, the verdict becomes **VERIFIED** or
  **CONFIRMED-RISK**.
- **Resilient:** an API error (quota, rate limit, network) doesn't break the page — facts still render,
  with a clear note.
- **Known limitation:** ERC-1155 `TransferBatch` events are skipped in event parsing (dynamic-array
  data); only `TransferSingle` is triaged.

## AI vs. human judgment

- **AI does:** read code + chain, explain risk in plain English, reconcile conflicting sources,
  triage and explain events.
- **A human owns:** verifying facts on-chain, signing off on severity, deciding what the Watchtower
  monitors, and — the one thing AI cannot do — **deploying the contract fix** if a real power exists.

## API correctness

Uses the OpenAI Responses API request shape supported by the configured LiteLLM gateway. Event
triage requests JSON Schema output; the report is plain text. The exact model alias must be enabled
by the Must LiteLLM deployment.

*Not investment advice. On-chain data is point-in-time and should be re-pulled at use.*
