"use client";

import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { AnalyzeResult } from "@/lib/types";

interface SharedReport {
  assetSlug: string;
  checkedAt: string;
  reviewedAt: string | null;
  address: string;
  chainId: number;
  facts: AnalyzeResult["facts"];
  powers: AnalyzeResult["powers"];
  assessment: AnalyzeResult["assessment"];
  events: AnalyzeResult["events"];
  report: string | null;
  alerts: AnalyzeResult["alerts"];
}

export function PublicTrustReport({ token }: { token: string }) {
  const [data, setData] = useState<SharedReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/reports/${token}`, { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "This report is unavailable.");
      setData(body as SharedReport);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "This report is unavailable."));
  }, [token]);

  return <>
    <SiteHeader />
    <main className="public-report-page">
      <div className="container public-report-container">
        <div className="eyebrow">Evidence-based review · public read-only report</div>
        {error && <section className="public-report-card"><h1>Report unavailable</h1><p>{error}</p></section>}
        {!error && !data && <section className="public-report-card"><span className="spinner" /> Loading reviewed evidence…</section>}
        {data && <>
          <section className="public-report-card public-report-heading">
            <div><div className="card-overline">{data.assetSlug.toUpperCase()} · {data.facts.chain.name}</div><h1>{data.facts.name || "Contract trust report"} {data.facts.symbol ? `(${data.facts.symbol})` : ""}</h1><code>{data.address}</code>
              <p>Scanned {new Date(data.checkedAt).toLocaleString()} · Human review recorded {data.reviewedAt ? new Date(data.reviewedAt).toLocaleString() : "—"}</p></div>
            <span className={`state-pill ${data.assessment.status === "risk" ? "state-warn" : data.assessment.status === "cleared" ? "state-ok" : "state-unknown"}`}>{data.assessment.status}</span>
          </section>
          <section className="public-report-card"><h2>Evidence summary</h2>
            <div className="public-facts-grid">
              <div><span>Token standard</span><strong>{data.facts.standard.toUpperCase()}</strong></div>
              <div><span>Owner permission</span><strong>{data.facts.owner_kind}</strong></div>
              <div><span>Pause state</span><strong>{data.facts.paused ? "Paused" : "Not paused"}</strong></div>
              <div><span>Upgradeable proxy</span><strong>{data.facts.is_proxy ? "Detected" : "Not detected"}</strong></div>
              {data.facts.is_proxy && <><div><span>Proxy implementation</span><strong>{data.facts.proxy_implementation || "Unresolved"}</strong></div><div><span>Proxy admin</span><strong>{data.facts.proxy_admin || "Unresolved"}</strong></div></>}
              <div><span>Privileged surfaces</span><strong>{data.powers.present.length ? data.powers.present.join(", ") : "None detected"}</strong></div>
              <div><span>Bytecode size</span><strong>{data.facts.bytecode_bytes ?? "Unresolved"} bytes</strong></div>
            </div>
          </section>
          <section className="public-report-card"><h2>Capability checks</h2><div className="public-findings">{data.assessment.reconciliation.map((finding, index) => <article key={`${finding.claim}-${index}`}><span className={`state-pill ${finding.verdict === "active" ? "state-warn" : finding.verdict === "unresolved" ? "state-unknown" : "state-ok"}`}>{finding.verdict.replace("_", " ")}</span><div><h3>{finding.claim}</h3><p>{finding.evidence}</p></div></article>)}</div><p className="report-caveat">{data.assessment.caveat}</p></section>
          {data.report && <section className="public-report-card"><h2>AI explanation</h2><p className="public-ai-report">{data.report}</p></section>}
          <section className="public-report-card public-report-limits"><h2>Scope and limits</h2><p>This is a point-in-time, read-only analysis of public blockchain data. It is not a guarantee of safety, a complete audit, financial advice, or a statement about token value. Verify important decisions against the live chain and the source documentation.</p><a href={`${data.facts.chain.explorer}/address/${data.address}`} target="_blank" rel="noopener noreferrer">Open address in {data.facts.chain.shortName} explorer ↗</a></section>
        </>}
      </div>
    </main>
    <SiteFooter />
  </>;
}
