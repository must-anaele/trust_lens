"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { TRUST_ASSETS } from "@/lib/trust-assets";
import type { ReviewRecord, ReviewStatus } from "@/lib/review-store";
import type { AnalyzeResult } from "@/lib/types";

const NETWORKS = [
  { id: 137, name: "Polygon" }, { id: 1, name: "Ethereum" }, { id: 8453, name: "Base" },
  { id: 42161, name: "Arbitrum" }, { id: 10, name: "Optimism" }, { id: 56, name: "BNB Chain" },
];

export default function AdminPage() {
  const [assetSlug, setAssetSlug] = useState("sut");
  const selectedAsset = useMemo(() => TRUST_ASSETS.find((asset) => asset.slug === assetSlug)!, [assetSlug]);
  const [address, setAddress] = useState(selectedAsset.suggestedAddress ?? "");
  const [chainId, setChainId] = useState(selectedAsset.suggestedChainId ? String(selectedAsset.suggestedChainId) : "");
  const [confirmed, setConfirmed] = useState(false);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [consoleReady, setConsoleReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/reviews", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(data.error || "Unable to load the review console.");
      setReviews(data.reviews); setEvents(data.events); setConsoleReady(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  function chooseAsset(slug: string) {
    setAssetSlug(slug);
    const asset = TRUST_ASSETS.find((item) => item.slug === slug)!;
    setAddress(asset.suggestedAddress ?? "");
    setChainId(asset.suggestedChainId ? String(asset.suggestedChainId) : "");
    setConfirmed(false); setMessage(""); setError("");
  }

  async function analyzeAndSave(event: FormEvent) {
    event.preventDefault(); setScanning(true); setError(""); setMessage("");
    try {
      const chain = Number(chainId);
      const saveResponse = await fetch("/api/admin/reviews", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetSlug, address: address.trim(), chainId: chain }),
      });
      const saved = await saveResponse.json();
      if (saveResponse.status === 401) { window.location.assign("/admin/login"); return; }
      if (!saveResponse.ok) throw new Error(saved.error || "Could not save the review.");
      setMessage("Analysis saved as pending human review.");
      setConfirmed(false);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setScanning(false); }
  }

  async function updateReview(review: ReviewRecord, status: ReviewStatus, note: string, published: boolean) {
    setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, note, published: published && status === "approved" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the review.");
      setMessage("Review decision saved.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.assign("/admin/login");
  }

  return <main className="admin-page">
    <header className="admin-topbar"><Link className="brand" href="/"><span className="logo" /> TRUST Lens</Link><div><span>Internal security review</span><button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button></div></header>
    <div className="admin-content">
      <div className="admin-heading"><div><div className="card-overline">SUT · MSQ · DeCT</div><h1>Trust operations</h1><p>Verify a contract reference, scan live chain evidence, and route it for human approval.</p></div><button className="btn btn-ghost btn-sm" onClick={() => void refresh()} disabled={loading}>Refresh</button></div>

      <section className="admin-metrics" aria-label="Review activity">
        <div><span>Saved analyses</span><strong>{reviews.length}</strong></div>
        <div><span>Human approved</span><strong>{reviews.filter((review) => review.status === "approved").length}</strong></div>
        <div><span>Reports published</span><strong>{reviews.filter((review) => review.published).length}</strong></div>
        <div><span>Chain changes</span><strong>{events.length}</strong></div>
      </section>

      <section className="admin-panel" aria-labelledby="asset-profiles-heading">
        <div className="admin-section-heading"><div><h2 id="asset-profiles-heading">Project profiles</h2><p>Public references are starting points. Confirm every contract address and network against approved company records before accepting a review.</p></div></div>
        <div className="asset-profile-grid">{TRUST_ASSETS.map((asset) => <article className="asset-profile" key={asset.slug}>
          <div className="asset-profile-head"><span className="asset-symbol">{asset.ticker}</span><span className="state-pill state-unknown">{asset.referenceState === "audit-reference" ? "Audit reference" : "Address unconfirmed"}</span></div>
          <h3>{asset.name}</h3><p>{asset.description}</p>
          <ul>{asset.useCases.map((use) => <li key={use}>{use}</li>)}</ul>
          <div className="asset-sources">{asset.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a>)}</div>
        </article>)}</div>
      </section>

      <section className="admin-panel" aria-labelledby="run-review-heading">
        <div className="admin-section-heading"><div><h2 id="run-review-heading">Run a contract review</h2><p>Only public chain data is submitted. Do not enter personal, KYC, banking, or member-record data.</p></div></div>
        <form className="admin-scan-form" onSubmit={analyzeAndSave}>
          <label>Project profile<select className="input" value={assetSlug} onChange={(event) => chooseAsset(event.target.value)}>{TRUST_ASSETS.map((asset) => <option key={asset.slug} value={asset.slug}>{asset.project} · {asset.ticker}</option>)}</select></label>
          <label>Network<select className="input" required value={chainId} onChange={(event) => setChainId(event.target.value)}><option value="">Choose network</option>{NETWORKS.map((network) => <option value={network.id} key={network.id}>{network.name}</option>)}</select></label>
          <label className="admin-address-field">Contract address<input className="input" required pattern="0x[a-fA-F0-9]{40}" spellCheck={false} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x followed by 40 hex characters" /></label>
          <label className="admin-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /><span>I confirmed this address and network against an approved company source. A public listing or prior audit is a reference, not current deployment verification.</span></label>
          {error && <p className="err" role="alert">{error}</p>}{message && <p className="admin-success" role="status">{message}</p>}
          <button className="btn btn-primary" type="submit" disabled={scanning || !confirmed || !consoleReady}>{scanning ? "Analyzing chain evidence…" : "Analyze and save for review"}</button>
          {!consoleReady && !loading && <p className="admin-storage-hint">Configure the database and complete the migration before running or saving staff reviews.</p>}
        </form>
      </section>

      <section className="admin-panel" aria-labelledby="reviews-heading">
        <div className="admin-section-heading"><div><h2 id="reviews-heading">Review queue</h2><p>Reports stay private until a reviewer approves and publishes them.</p></div><span className="admin-count">{reviews.length} recent</span></div>
        {loading ? <p className="mut">Loading review records…</p> : error && !reviews.length ? <p className="admin-error">{error}</p> : reviews.length === 0 ? <div className="admin-empty">No saved reviews yet.</div> : <div className="review-queue">{reviews.map((review) => <ReviewQueueItem key={review.id} review={review} onSave={updateReview} />)}</div>}
      </section>

      <section className="admin-panel" aria-labelledby="monitor-heading">
        <div className="admin-section-heading"><div><h2 id="monitor-heading">Monitoring events</h2><p>Events appear after a scheduled monitor run compares an approved review with current chain state.</p></div><span className="admin-count">{events.length}</span></div>
        {events.length === 0 ? <div className="admin-empty">No changes recorded. Monitoring requires the database migration and a scheduled server request configured with a cron secret.</div> : <div className="monitor-event-list">{events.map((event, index) => <article className="monitor-event" key={String(event.id ?? index)}><div><strong>{String(event.change_type)}</strong><span>{String(event.asset_slug).toUpperCase()} · {String(event.address)}</span></div><time>{new Date(String(event.created_at)).toLocaleString()}</time><p><b>Before:</b> {JSON.stringify(event.before_value)} <b>After:</b> {JSON.stringify(event.after_value)}</p></article>)}</div>}
      </section>
    </div>
  </main>;
}

function ReviewQueueItem({ review, onSave }: { review: ReviewRecord; onSave: (review: ReviewRecord, status: ReviewStatus, note: string, published: boolean) => Promise<void> }) {
  const [status, setStatus] = useState<ReviewStatus>(review.status);
  const [note, setNote] = useState(review.review_note ?? "");
  const [published, setPublished] = useState(review.published);
  return <article className="review-queue-item">
    <div className="review-queue-title"><div><div className="card-overline">{review.asset_slug.toUpperCase()} · {review.result.facts.chain.shortName}</div><h3>{review.result.facts.name || "Contract review"} <span className="review-ticker">{review.result.facts.symbol ? `(${review.result.facts.symbol})` : ""}</span></h3><code>{review.address}</code></div><span className={`state-pill ${review.status === "approved" ? "state-ok" : review.status === "needs_action" ? "state-warn" : "state-unknown"}`}>{review.status.replace("_", " ")}</span></div>
    <p className="review-quick-facts">{review.result.facts.standard.toUpperCase()} · {review.result.assessment.status.toUpperCase()} · scanned {new Date(review.checked_at).toLocaleString()} · {review.result.assessment.reconciliation.length} reconciliation checks</p>
    {review.result.assessment.reconciliation.map((finding, index) => <div className="review-finding" key={`${finding.claim}-${index}`}><strong>{finding.verdict.replace("_", " ")}</strong><span>{finding.claim}</span><small>{finding.evidence}</small></div>)}
    <label className="review-note-label">Reviewer note<textarea className="textarea" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} placeholder="Decision context, follow-up owner, or evidence needed" /></label>
    <div className="review-actions"><label>Status<select className="input" value={status} onChange={(event) => setStatus(event.target.value as ReviewStatus)}><option value="pending">Pending</option><option value="needs_action">Needs action</option><option value="approved">Approved</option></select></label><label className="publish-toggle"><input type="checkbox" checked={published} disabled={status !== "approved"} onChange={(event) => setPublished(event.target.checked)} /> Publish reviewed report</label><button className="btn btn-primary btn-sm" onClick={() => void onSave(review, status, note, published)}>Save review</button></div>
    {review.published && review.share_token && <p className="share-report">Public reviewed report: <Link href={`/report/${review.share_token}`} target="_blank">Open share page ↗</Link></p>}
  </article>;
}
