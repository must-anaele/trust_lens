"use client";

import { useState } from "react";
import type { AnalyzeResult, Facts, Powers, Verdict } from "@/lib/types";

const SUT = "0x98965474ecbec2f532f1f780ee37b0b05f77ca55";
const SEV_CLASS: Record<string, string> = { critical: "bad", high: "warn", medium: "warn", info: "ok" };

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Honesty />
      </main>
      <Footer />
    </>
  );
}

/* ---------------- header ---------------- */
function Header() {
  return (
    <header className="hdr">
      <div className="container hdr-in">
        <div className="brand">
          <span className="logo" />
          TrustLens
        </div>
        <nav>
          <a href="#features" className="hide-sm">Features</a>
          <a href="#how" className="hide-sm">How it works</a>
          <a href="#analyze" className="btn btn-ghost btn-sm">Analyze a token</a>
        </nav>
      </div>
    </header>
  );
}

/* ---------------- hero + analyzer ---------------- */
function Hero() {
  const [address, setAddress] = useState(SUT);
  const [source, setSource] = useState("");
  const [showSource, setShowSource] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResult | null>(null);

  async function analyze() {
    setLoading(true); setError(null); setData(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: address.trim(), source: source.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setData(json as AnalyzeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="hero" id="analyze">
      <div className="container">
        <span className="eyebrow">◆ On-chain trust, verified by AI</span>
        <h1>
          Know if a token is <span className="grad">actually trustworthy</span> — in seconds.
        </h1>
        <p className="lede">
          TrustLens reads the live blockchain and has an AI auditor explain, in plain English, what a
          token&apos;s contract can really do — and watches it for dangerous moves. Trust becomes a fact
          you can check, not a claim you have to take on faith.
        </p>

        <div className="analyzer">
          <p className="label">Paste any ERC-20 contract address on Polygon</p>
          <div className="bar">
            <input
              className="input"
              value={address}
              spellCheck={false}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && analyze()}
              placeholder="0x… token contract address"
            />
            <button className="btn btn-primary" onClick={analyze} disabled={loading}>
              {loading ? "Analyzing…" : "Verify trust →"}
            </button>
          </div>
          <button className="linkbtn" onClick={() => setShowSource((s) => !s)}>
            {showSource ? "− Hide verified source" : "+ Paste verified Solidity source (optional, but decisive)"}
          </button>
          {showSource && (
            <textarea
              className="textarea"
              value={source}
              spellCheck={false}
              onChange={(e) => setSource(e.target.value)}
              placeholder="// Paste the verified contract source. Without it, privileged-function status stays UNRESOLVED rather than guessed."
            />
          )}
          {error && <p className="err">⚠ {error}</p>}
          {loading && (
            <div className="loading"><span className="spinner" /> Reading the chain and running the AI auditor… (≈20–40s with AI)</div>
          )}
          {data && <Results data={data} />}
        </div>

        <div className="hero-chips">
          <span className="chip"><span className="dot" /> Live on-chain reads</span>
          <span className="chip">⚡ Polygon PoS</span>
          <span className="chip">✦ Powered by Claude</span>
          <span className="chip">🔒 No wallet, no signup</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- results ---------------- */
const STATUS_META: Record<string, { ico: string; cls: string }> = {
  cleared: { ico: "✅", cls: "ok" },
  unresolved: { ico: "⚠️", cls: "warn" },
  risk: { ico: "🔴", cls: "bad" },
};
const RECON_META: Record<string, { label: string; cls: string }> = {
  not_supported: { label: "Not supported ✓", cls: "ok" },
  neutralized: { label: "Neutralized ✓", cls: "ok" },
  display_only: { label: "Display-only", cls: "mut" },
  unresolved: { label: "Needs source", cls: "warn" },
  active: { label: "Active ⚠", cls: "bad" },
};

function Results({ data }: { data: AnalyzeResult }) {
  const { facts, powers, assessment, alerts, report, aiError, hasKey } = data;
  const meta = STATUS_META[assessment.status] ?? STATUS_META.unresolved;
  return (
    <div className="results">
      <div className={`verdict ${meta.cls}`}>
        <span className="ico">{meta.ico}</span>
        <span>
          <div className="vt">{assessment.headline}</div>
          <div className="vs">
            {facts.name} ({facts.symbol}) · {short(facts.contract)} · computed on-chain
          </div>
        </span>
      </div>

      <ReconCard assessment={assessment} />

      <div className="grid2">
        <FactsCard facts={facts} powers={powers} />
        <WatchtowerFeed alerts={alerts} hasKey={hasKey} eventCount={data.events.length} />
      </div>

      {report && (
        <div className="card report" style={{ marginTop: 16 }}>
          <h3>AI Trust Report</h3>
          <pre>{report}</pre>
        </div>
      )}
      {!report && hasKey && aiError && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>AI Trust Report</h3>
          <p className="warn" style={{ margin: "0 0 6px" }}>AI narrative unavailable: {aiError}</p>
          <p className="mut" style={{ margin: 0, fontSize: 13 }}>
            The verdict and reconciliation above are computed on-chain and stand without the AI. If this
            mentions a usage/rate limit, check console.anthropic.com → Billing/Limits.
          </p>
        </div>
      )}
      {!hasKey && (
        <p className="mut" style={{ fontSize: 13, marginTop: 14 }}>
          Verdict &amp; reconciliation above are computed deterministically on-chain — <b>no API key needed</b>.
          Add <code>ANTHROPIC_API_KEY</code> in <code>.env.local</code> for the AI narrative report + event triage.
        </p>
      )}
    </div>
  );
}

function ReconCard({ assessment }: { assessment: AnalyzeResult["assessment"] }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Scanner claim vs. on-chain evidence</h3>
      <div className="recon">
        {assessment.reconciliation.map((r, i) => {
          const m = RECON_META[r.verdict] ?? RECON_META.unresolved;
          return (
            <div className="rc" key={i}>
              <div className="rc-claim">{r.claim}</div>
              <div className="rc-ev mut">{r.evidence}</div>
              <div className={`rc-v ${m.cls}`}>{m.label}</div>
            </div>
          );
        })}
      </div>
      <p className="mut" style={{ margin: "12px 0 0", fontSize: 12.5 }}>{assessment.caveat}</p>
    </div>
  );
}

function FactsCard({ facts, powers }: { facts: Facts; powers: Powers }) {
  const ownerOk = facts.owner.endsWith("0".repeat(40));
  const supply = facts.total_supply !== null ? `${facts.total_supply.toLocaleString()} ${facts.symbol ?? ""}` : "—";
  const detected = powers.present.length ? powers.present.join(", ") : "none detected";
  const rows: [string, string, string][] = [
    ["Token", `${facts.name ?? "?"} · ${facts.decimals ?? "?"} dec`, "v"],
    ["Total supply", supply, "v"],
    ["Upgradeable proxy", facts.is_proxy ? "Yes — code can change" : "No — immutable", facts.is_proxy ? "bad" : "ok"],
    ["Active admin owner", facts.owner_kind, ownerOk ? "ok" : "warn"],
    ["Privileged surfaces", detected, powers.present.filter((p) => p !== "pause").length ? "warn" : "ok"],
    ["Paused", facts.paused ? "Yes — transfers halted" : "No", facts.paused ? "bad" : "ok"],
  ];
  return (
    <div className="card">
      <h3>Verified on-chain</h3>
      {rows.map(([k, v, cls]) => (
        <div className="row" key={k}><span className="k">{k}</span><span className={`v ${cls}`}>{v}</span></div>
      ))}
      <div className="row"><span className="k">Contract</span><span className="v"><code>{short(facts.contract)}</code></span></div>
    </div>
  );
}

function WatchtowerFeed({ alerts, hasKey, eventCount }: { alerts: Verdict[] | null; hasKey: boolean; eventCount: number }) {
  return (
    <div className="card feed">
      <h3>AI Watchtower · recent events</h3>
      {alerts && alerts.length > 0 ? (
        alerts.map((a, i) => (
          <div className="ev" key={i}>
            <span>{a.emoji}</span>
            <span>
              <span className={`sev ${SEV_CLASS[a.severity]}`}>{a.severity.toUpperCase()}</span>{" "}
              <span className="body">{a.headline}</span> <span className="why">{a.why_it_matters}</span>
            </span>
          </div>
        ))
      ) : (
        <p className="mut" style={{ margin: 0, fontSize: 13.5 }}>
          {hasKey
            ? `${eventCount} recent event(s) found — no AI triage in this run.`
            : `${eventCount} recent event(s) found on-chain. Add an API key to enable AI triage.`}
        </p>
      )}
    </div>
  );
}

/* ---------------- features ---------------- */
function Features() {
  const items = [
    { icon: "🔎", title: "AI Auditor & Explainer", body: "Reads the contract and live chain, then explains in plain English what powers exist and what could go wrong — and reconciles it when a scanner and the chain disagree.", tag: "The read" },
    { icon: "📡", title: "AI Watchtower", body: "Streams on-chain events — ownership changes, mints, pauses, large transfers — and triages each into a clear, severity-ranked alert a non-engineer understands.", tag: "The watch" },
    { icon: "🛡️", title: "Public Trust Page", body: "A live, self-serve trust status anyone can check before they buy or list — always current, never a stale PDF. Trust becomes a fact, not a claim.", tag: "The proof" },
  ];
  return (
    <section className="section" id="features">
      <div className="container">
        <h2 className="h2">Three ways trust becomes verifiable</h2>
        <p className="sec-lede">TrustLens turns raw Solidity and blockchain noise into something a person can actually act on — continuously, not once.</p>
        <div className="fgrid">
          {items.map((f) => (
            <div className="feature" key={f.title}>
              <div className="ficon">{f.icon}</div>
              <h4>{f.title}</h4>
              <p>{f.body}</p>
              <span className="tag">{f.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- how it works ---------------- */
function HowItWorks() {
  const steps = [
    { h: "Paste an address", p: "Any ERC-20 on Polygon. No wallet connection, no signup, nothing to install." },
    { h: "We read the chain", p: "TrustLens pulls verified on-chain facts and recent events straight from public RPC — independently checkable by anyone." },
    { h: "AI explains the risk", p: "Claude writes a plain-English Trust Report and triages events, cleanly separating verified facts from unverified claims." },
  ];
  return (
    <section className="section" id="how" style={{ background: "var(--bg-2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
      <div className="container">
        <h2 className="h2">How it works</h2>
        <p className="sec-lede">From address to answer in one step — the evidence is always yours to verify.</p>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step" key={i}>
              <div className="n">{i + 1}</div>
              <h4>{s.h}</h4>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- honesty callout ---------------- */
function Honesty() {
  return (
    <section className="section">
      <div className="container">
        <div className="callout">
          <span className="big">🎯</span>
          <div>
            <h3>Honest by design</h3>
            <p>
              TrustLens never overstates safety. Without the verified source it says a risk is
              <b> UNRESOLVED</b> instead of guessing, and it always separates what&apos;s proven on-chain from
              what a third-party scanner merely claims. It makes trust <i>visible</i> — it does not pretend to
              remove a dangerous power that only a contract fix can. That candor is the point.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- footer ---------------- */
function Footer() {
  return (
    <footer className="footer">
      <div className="container row-f">
        <div className="brand" style={{ fontSize: 14 }}><span className="logo" /> TrustLens</div>
        <span>Not investment advice · on-chain data is point-in-time · built with Next.js + Claude</span>
      </div>
    </footer>
  );
}

/* ---------------- utils ---------------- */
function short(addr: string) {
  return addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
