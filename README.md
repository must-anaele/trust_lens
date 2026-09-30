# TrustLens — Next.js + TypeScript

**An AI trust-verification web app for EVM tokens and NFTs.** Paste any contract address →
TrustLens auto-detects the chain and standard (ERC-20 / ERC-721 / ERC-1155 across Polygon,
Ethereum, Base, Arbitrum, Optimism, BNB Chain), reads the live chain, and (when configured)
uses Anthropic's **Messages API** to write a plain-English Trust Report and triage recent
on-chain events. The server-side model is configurable with `ANTHROPIC_MODEL`. Built on Next.js
(App Router) + TypeScript + server-side `fetch`.

The app also includes a consent-based **Wallet Analysis** page at `/wallet-review` for a selected
EVM chain. It reads native balance, account nonce, deployed-code presence, and recent ERC-20
allowances, ERC-721 token approvals, and ERC-721/ERC-1155 operator approvals using public RPC data.
It does not request identity/KYC data, connect a wallet, or sign transactions. The approval review
is limited to the latest 50,000 blocks and supported event patterns; it is not a full wallet audit.

The **Market Watchlist** MVP lives at `/markets`. It provides paginated CoinMarketCap listings,
recently listed assets, descriptive 24-hour movers, account-synced favorites, and user-created price
or 24-hour change alerts. Alerts appear in the app after the scheduled checker detects a threshold
crossing. Discovery signals are descriptive and are not buy/sell advice.

The app now includes a staff **Trust Operations** console at `/admin/login`. Authorized reviewers can
scan a SUT/MSQ candidate contract on a chosen supported chain, save the evidence as a private review,
record a human decision, and publish an unguessable read-only report link. Approved reviews can be
checked by the scheduled monitor endpoint; detected changes are recorded in the console. SUT and
MSQ profiles are intentionally separate. The SUT address seeded in the console is only a 2024 audit
reference; MSQ's address and network are left blank pending confirmation from an approved company
source.

Week-1 PIP deliverable (Nnaemeka Anaele). Selected problem: *anyone evaluating a token cannot
quickly or continuously verify what the contract can do, or whether anything dangerous is
happening.* See `../SUT-Solution-AI-Plan.md`.

## Architecture

```
Browser (app/page.tsx)
   │  POST /api/analyze { address, source? }
   ▼
Server route (app/api/analyze/route.ts)   ← the Anthropic API key stays server-side
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
| `app/admin/page.tsx` | Staff review console: project profiles, analysis queue, decisions, publication and monitor events |
| `app/api/cron/monitor/route.ts` | Secret-protected scheduled contract-state comparison for approved reviews |
| `app/markets/page.tsx` | Token market, discovery, watchlist, and alert dashboard |
| `app/account/page.tsx` | Supabase email/password account sign-in and registration |
| `app/api/cron/price-alerts/route.ts` | Secret-protected scheduled price-alert evaluation |
| `lib/market-data.ts` | Server-only CoinMarketCap listings and quote client |
| `lib/user-auth.ts` | Supabase Auth session cookies and verified user lookup |
| `supabase/migrations/202609290001_market_watchlist_alerts.sql` | Synced watchlists and price-alert storage |
| `lib/review-store.ts` | Server-only Supabase PostgREST persistence for reviews and monitor records |
| `lib/admin-auth.ts` | Signed, HTTP-only, eight-hour admin session |
| `lib/trust-assets.ts` | SUT/MSQ candidate profile registry with explicit reference status |
| `supabase/migrations/202609240001_trustlens_operations.sql` | Private review, monitoring snapshot, and change-event tables |
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
| `lib/watchtower.ts` | Event classifier with Anthropic JSON Schema output |
| `lib/anthropic-client.ts` | Server-only Anthropic Messages API client |
| `lib/types.ts` | Shared types (`Facts` carries `chain` + `standard` discriminant) |

## Run it

```bash
cd trustlens-next
npm install

# optional but recommended — enables the AI report + event triage:
cp .env.example .env.local
# set ANTHROPIC_API_KEY; if the key is not workspace-scoped, also set ANTHROPIC_WORKSPACE_ID.
# confirm ANTHROPIC_MODEL is enabled for your account

npm run dev
# open http://localhost:3000, paste any token/NFT contract address, click Analyze contract
```

Production build:

```bash
npm run build && npm start
```

## Trust Operations setup

The review console requires a Supabase Postgres project. Apply
`supabase/migrations/202609240001_trustlens_operations.sql` using the Supabase SQL editor or your
approved migration workflow. Set these server environment variables from `.env.example`:

- `TRUSTLENS_ADMIN_PASSWORD`: unique staff password (minimum 16 characters).
- `TRUSTLENS_ADMIN_SESSION_SECRET`: independent random secret (minimum 32 characters).
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY`: server-side database access. Never expose the
  service-role key to browser code or commit it.
- `TRUSTLENS_MONITOR_CRON_SECRET`: independent random secret used by the scheduler.

Open `/admin/login` to access the staff console. The current console uses one shared password; put
it behind the company's identity-aware access gateway and upstream login rate limiting before a
broader production rollout. Replace the shared password with SSO and per-reviewer identity before
using it for formal sign-off.

Schedule a POST to `/api/cron/monitor` with `Authorization: Bearer <TRUSTLENS_MONITOR_CRON_SECRET>`.
Each run checks up to 10 least-recently-monitored approved contracts and saves changes to the admin
console. The route does not send email or chat notifications yet. Monitoring begins only after an
approved human review has been saved.

## Market Watchlist setup

Apply `supabase/migrations/202609290001_market_watchlist_alerts.sql` in the same Supabase project.
Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` on the server, plus
`COINMARKETCAP_API_KEY` and a separate random `TRUSTLENS_ALERT_CRON_SECRET`. Never expose these as
`NEXT_PUBLIC_` values. Enable email confirmation and configure the allowed site and redirect URLs in
Supabase Auth before launch. Access and refresh tokens are stored in HTTP-only cookies; watchlist and
alert tables are not directly accessible to browser clients.

Market listings are paginated in batches of 100. The recent listings tab uses CoinMarketCap's
Listings New endpoint, which currently requires a Startup or higher API plan; confirm your account's
access and current data licensing terms. If that plan is unavailable, the endpoint reports its
provider error while market listings and watchlists remain available. Market responses are cached
server-side for about one minute. Check current CMC credit usage and redistribution terms for the
intended production use.

Schedule a POST to `/api/cron/price-alerts` every five minutes with
`Authorization: Bearer <TRUSTLENS_ALERT_CRON_SECRET>`. The route evaluates up to 500 active alerts
and saves in-app notifications. It does not send email, SMS, or push notifications. Apply deployment
rate limits to public routes before public launch.

The console asks reviewers to confirm the address and network against approved company records.
The seeded SUT address comes from an October 2024 public audit and is not treated as current
verification. The MSQ contract address is intentionally not seeded. Confirm both token identity
and chain from a company-controlled source before approving or publishing a report.

Public analysis endpoints call external RPC providers and may call Anthropic.
Apply request rate limits at the deployment edge before exposing them to high-volume traffic.
Never send member, KYC, banking, identity, phone, or email data to these endpoints; only submit
public contract/wallet addresses, chain selection, and scan consent where applicable.

Wallet scans use public RPC endpoints by default. If the server cannot reach them or they are
rate-limited, set a chain-specific `*_RPC_URLS` variable in `.env.local` to one or more JSON-RPC
endpoints (comma-separated for failover), then restart the server. Keep provider credentials inside
the endpoint URL server-side; do not expose them with a `NEXT_PUBLIC_` variable.

## Behaviour

- **Auto-detect:** the same address is probed on every supported chain in parallel; the report
  covers the highest-priority chain where a recognized standard was found (Polygon first, so the
  demo token still works), and the UI notes "also found on …" for other chains.
- **No Anthropic key configured:** returns verified on-chain facts + recent events; the AI report/alerts are skipped
  (the page says so). The trust claim itself stays independently verifiable — the point of the product.
- **With Anthropic configured:** the configured model writes the Trust Report and triages events.
  `ANTHROPIC_API_KEY` is read server-side only and never sent to the browser. The model is
  configurable through environment variables.
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

Uses Anthropic's Messages API. Event triage requests JSON Schema output; the report is plain text.
The selected model must be enabled for your Anthropic account.

*Not investment advice. On-chain data is point-in-time and should be re-pulled at use.*
