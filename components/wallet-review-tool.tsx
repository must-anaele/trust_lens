"use client";

import { useState } from "react";
import type { WalletReview as WalletReviewData } from "@/lib/wallet";
import { useLanguage } from "@/components/language-provider";

const CHAINS = [
  { id: 137, name: "Polygon" }, { id: 1, name: "Ethereum" },
  { id: 8453, name: "Base" }, { id: 42161, name: "Arbitrum" },
  { id: 10, name: "Optimism" }, { id: 56, name: "BNB Chain" },
];

function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function WalletReviewTool() {
  const { language, t } = useLanguage();
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState("137");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WalletReviewData | null>(null);

  async function scan() {
    setLoading(true); setError(null); setData(null);
    try {
      const response = await fetch("/api/wallet-review", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: address.trim(), chainId: Number(chainId), consent, language }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || `Request failed (${response.status})`);
      setData(json as WalletReviewData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setLoading(false); }
  }

  return (
    <div className="wallet-workspace">
      <div className="wallet-workspace-main">
        <section className="wallet-form-card" aria-labelledby="wallet-form-title">
          <div className="wallet-form-heading">
            <div className="wallet-form-mark" aria-hidden="true">⌁</div>
            <div>
              <div className="card-overline">{t("wallet.inspect")}</div>
              <h2 id="wallet-form-title">{t("wallet.start")}</h2>
            </div>
            <span className="read-only-badge"><i /> {t("wallet.live")}</span>
          </div>
          <p className="wallet-form-intro">{t("wallet.intro")}</p>
          <form onSubmit={(event) => { event.preventDefault(); if (!loading && consent) void scan(); }}>
            <div className="wallet-form">
              <label className="wallet-field"><span>{t("wallet.address")}</span>
                <div className="address-field">
                  <input className="input" value={address} spellCheck={false} autoComplete="off" required
                    pattern="0x[a-fA-F0-9]{40}" title={t("wallet.addressTitle")}
                    onChange={(event) => setAddress(event.target.value)} placeholder={t("wallet.addressPlaceholder")} />
                </div>
              </label>
              <label className="wallet-field"><span>{t("wallet.network")}</span>
                <select className="input" value={chainId} onChange={(event) => setChainId(event.target.value)}>
                  {CHAINS.map((chain) => <option key={chain.id} value={chain.id}>{chain.name}</option>)}
                </select>
              </label>
            </div>
            <label className="consent-row">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span><strong>{t("wallet.consent")}</strong><small>{t("wallet.consentText")}</small></span>
            </label>
            <button className="btn btn-primary wallet-submit" type="submit" disabled={loading || !consent || !address.trim()}>
              {loading ? <>{t("wallet.analyzing")} <span className="spinner" aria-hidden="true" /></> : <>{t("wallet.analyze")} <span aria-hidden="true">→</span></>}
            </button>
          </form>
          <p className="privacy-note"><span aria-hidden="true">ⓘ</span> {t("wallet.privacy")}</p>
          {error && <p className="err wallet-error" role="alert">⚠ {error}</p>}
          {loading && <div className="scan-status" role="status" aria-live="polite"><span className="spinner" /> {t("wallet.loading")} {CHAINS.find((chain) => String(chain.id) === chainId)?.name}…</div>}
        </section>
        {data && <WalletApprovalResults data={data} />}
      </div>
      <aside className="wallet-sidebar">
        <div className="wallet-sidebar-card">
          <div className="sidebar-icon">⌁</div><h3>{t("wallet.checks")}</h3>
          <ul><li>{t("wallet.erc20")}</li><li>{t("wallet.erc721")}</li><li>{t("wallet.operators")}</li><li>{t("wallet.current")}</li></ul>
        </div>
        <div className="wallet-sidebar-card muted-card">
          <div className="card-overline">{t("wallet.scope")}</div><h3>{t("wallet.bounded")}</h3>
          <p>{t("wallet.scopeText")}</p>
        </div>
      </aside>
    </div>
  );
}

function WalletApprovalResults({ data }: { data: WalletReviewData }) {
  const { t } = useLanguage();
  const active = data.approvals.filter((approval) => approval.active === true).length;
  const unresolved = data.approvals.filter((approval) => approval.active === null).length;
  const summary = active ? `${active} ${t("wallet.activeSummary")}` : unresolved ? t("wallet.unresolvedSummary") : t("wallet.noneSummary");
  return (
    <section className="wallet-report" aria-labelledby="wallet-report-title">
      <div className={`wallet-summary ${active ? "warn" : unresolved ? "unknown" : "ok"}`}>
        <div><div className="card-overline">{t("wallet.report")}</div><h2 id="wallet-report-title">{summary}</h2>
          <p>{data.chain.name} · {shortAddress(data.address)} · checked {new Date(data.checkedAt).toLocaleString()}</p></div>
        <div className="summary-stat"><strong>{data.approvals.length}</strong><span>{t("wallet.permissions")}</span></div>
      </div>
      <div className="wallet-overview">
        <div><span>{t("wallet.balance")}</span><strong>{data.nativeBalance} {data.chain.nativeSymbol}</strong></div>
        <div><span>{t("wallet.nonce")}</span><strong>{data.accountNonce}</strong></div>
        <div><span>{t("wallet.code")}</span><strong>{data.hasCode ? t("wallet.codeYes") : t("wallet.codeNo")}</strong></div>
      </div>
      {data.approvals.length === 0 ? <div className="empty-state"><span>✓</span><h3>{t("wallet.noEvents")}</h3><p>{t("wallet.noEventsText")}</p></div> : (
        <div className="approval-list">{data.approvals.map((approval, index) => <article className="approval-item" key={`${approval.contract}-${approval.spender}-${approval.tokenId ?? "all"}-${index}`}>
          <div className="approval-head"><div><div className="card-overline">{approval.kind}</div><strong>{approval.active === true ? t("wallet.active") : approval.active === false ? t("wallet.inactive") : t("wallet.unresolved")}</strong></div>
            <span className={`state-pill ${approval.active === true ? "state-warn" : approval.active === false ? "state-ok" : "state-unknown"}`}>{approval.active === true ? t("wallet.activeState") : approval.active === false ? t("wallet.inactiveState") : t("wallet.unknownState")}</span>
          </div>
          <div className="approval-details">
            <div><span>{t("wallet.asset")}</span><a href={`${data.chain.explorer}/address/${approval.contract}`} target="_blank" rel="noopener noreferrer">{shortAddress(approval.contract)} ↗</a></div>
            <div><span>{t("wallet.approved")}</span><a href={`${data.chain.explorer}/address/${approval.spender}`} target="_blank" rel="noopener noreferrer">{shortAddress(approval.spender)} ↗</a></div>
            {approval.amount && <div><span>{t("wallet.allowance")}</span><code>{approval.amount}</code></div>}
            {approval.tokenId && <div><span>{t("wallet.tokenId")}</span><code>{approval.tokenId}</code></div>}
          </div>
          <p className="approval-evidence"><b>{t("wallet.evidence")}</b>{approval.evidence}</p>
        </article>)}</div>
      )}
      <div className="report-caveat"><b>{t("wallet.coverage")}</b><p>{data.caveat}</p><p>{t("wallet.reportCaveat")}</p></div>
    </section>
  );
}
