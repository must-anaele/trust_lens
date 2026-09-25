"use client";

import { useState, type ReactNode } from "react";
import type { AnalyzeResult, Facts, Powers, Verdict } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

const SEV_CLASS: Record<string, string> = {
  critical: "bad",
  high: "warn",
  medium: "warn",
  info: "ok",
};

/* ---------------- hero + analyzer ---------------- */
export function ContractAnalyzer() {
  const { language, t } = useLanguage();
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("");
  const [showSource, setShowSource] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResult | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: address.trim(),
          source: source.trim() || undefined,
          language,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || `Request failed (${res.status})`);
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
        <span className="eyebrow">{t("home.eyebrow")}</span>
        <h1>
          {t("home.title")}{" "}
          <span className="grad">{t("home.titleAccent")}</span>
        </h1>
        <p className="lede">
          {t("home.lede")}
        </p>

        <div className="analyzer">
          <p className="label">
            {t("home.paste")}{" "}
            <Tip term="token contract">
              <b>{t("home.tokenStandards")}</b>{" "}{t("home.glossary")}
              <br />• {t("home.erc20")} <code>totalSupply</code>, <code>transfer</code>)
              <br />• {t("home.erc721")}
              <br />• {t("home.erc1155")}
              <span className="tip-src">
                {t("home.source")}{" "}
                <a
                  href="https://www.investopedia.com/news/what-erc20-and-what-does-it-mean-ethereum/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Investopedia — ERC-20
                </a>
              </span>
            </Tip>{" "}{t("home.contractAddress")}
          </p>
          <div className="bar">
            <input
              className="input"
              value={address}
              spellCheck={false}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && analyze()}
              placeholder={t("home.placeholder")}
            />
            <button
              className="btn btn-primary"
              onClick={analyze}
              disabled={loading}
            >
              {loading ? t("home.analyzing") : t("home.analyze")}
            </button>
          </div>
          <button className="linkbtn" onClick={() => setShowSource((s) => !s)}>
            {showSource
              ? t("home.hideSource")
              : t("home.showSource")}
          </button>
          {showSource && (
            <textarea
              className="textarea"
              value={source}
              spellCheck={false}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t("home.sourcePlaceholder")}
            />
          )}
          {error && <p className="err">⚠ {error}</p>}
          {loading && (
            <div className="loading">
              <span className="spinner" /> {t("home.loading")}
            </div>
          )}
          {data && <Results data={data} />}
        </div>

        <div className="hero-chips">
          <span className="chip">
            <span className="dot" /> {t("home.live")}
          </span>
          <span className="chip">{t("home.chains")}</span>
          <span className="chip">{t("home.ai")}</span>
          <span className="chip">{t("home.noWallet")}</span>
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
  const { t } = useLanguage();
  const {
    facts,
    powers,
    assessment,
    alerts,
    report,
    aiError,
    hasAiProvider,
    alsoFoundOn,
  } = data;
  const meta = STATUS_META[assessment.status] ?? STATUS_META.unresolved;
  const stdLabel = facts.standard.replace("erc", "ERC-");
  return (
    <div className="results">
      <div className={`verdict ${meta.cls}`}>
        <span className="ico">{meta.ico}</span>
        <span>
          <div className="vt">{assessment.headline}</div>
          <div className="vs">
            {facts.name ?? "Unknown"} {facts.symbol ? `(${facts.symbol})` : ""}{" "}
          · {stdLabel} on {facts.chain.shortName} · {short(facts.contract)} · {t("result.computed")}
          </div>
        </span>
      </div>

      {alsoFoundOn && alsoFoundOn.length > 0 && (
        <p className="mut" style={{ margin: "10px 2px 0", fontSize: 13 }}>
          {t("result.alsoFound")} {alsoFoundOn.map((c) => c.shortName).join(", ")} {t("result.covers")} {facts.chain.shortName}.
        </p>
      )}

      <ReconCard assessment={assessment} />

      <div className="grid2">
        <FactsCard facts={facts} powers={powers} />
        <WatchtowerFeed
          alerts={alerts}
          hasAiProvider={hasAiProvider}
          eventCount={data.events.length}
        />
      </div>

      {report && (
        <div className="card report" style={{ marginTop: 16 }}>
        <h3>{t("result.report")}</h3>
          <ReportMarkdown text={report} />
        </div>
      )}
      {!report && hasAiProvider && aiError && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>{t("result.report")}</h3>
          <p className="warn" style={{ margin: "0 0 6px" }}>
            AI narrative unavailable: {aiError}
          </p>
          <p className="mut" style={{ margin: 0, fontSize: 13 }}>
            The verdict and reconciliation above are computed from chain evidence
            and remain available without the AI. Check the Anthropic configuration
            and confirm the selected model is enabled for your account.
          </p>
        </div>
      )}
      {!hasAiProvider && (
        <p className="mut" style={{ fontSize: 13, marginTop: 14 }}>
          {t("result.noAi")} <b>{t("result.noAiNeed")}</b>. {t("result.configure")} {" "}
          <code>ANTHROPIC_API_KEY</code> {t("result.enableAi")}
        </p>
      )}
    </div>
  );
}

function ReconCard({
  assessment,
}: {
  assessment: AnalyzeResult["assessment"];
}) {
  const { t } = useLanguage();
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>{t("result.reconcile")}</h3>
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
      <p className="mut" style={{ margin: "12px 0 0", fontSize: 12.5 }}>
        {assessment.caveat}
      </p>
    </div>
  );
}

function FactsCard({ facts, powers }: { facts: Facts; powers: Powers }) {
  const { t } = useLanguage();
  const ownerOk = facts.owner.endsWith("0".repeat(40));
  const detected = powers.present.length
    ? powers.present.join(", ")
    : "none detected";
  const isErc20 = facts.standard === "erc20";
  const supply =
    isErc20 && facts.total_supply != null
      ? `${facts.total_supply.toLocaleString()} ${facts.symbol ?? ""}`
      : null;
  const rows: [string, string, string][] = [
    [t("result.chain"), `${facts.chain.name}`, "v"],
    [t("result.standard"), facts.standard.replace("erc", "ERC-").toUpperCase(), "v"],
  ];
  if (isErc20) {
    rows.push(
      [t("result.decimals"), `${facts.decimals ?? "?"}`, "v"],
      [t("result.supply"), supply ?? "—", "v"],
    );
  } else if (facts.token_uri_sample) {
    rows.push([
      t("result.metadata"),
      truncate(facts.token_uri_sample, 42),
      "v",
    ]);
  }
  if (facts.is_proxy) {
    rows.push(
      [t("result.proxyImpl"), facts.proxy_implementation ?? "unresolved", facts.proxy_implementation ? "v" : "warn"],
      [t("result.proxyAdmin"), facts.proxy_admin ?? "unresolved", facts.proxy_admin ? "v" : "warn"],
    );
  }
  rows.push(
    [
      t("result.proxy"),
      facts.is_proxy ? t("result.proxyYes") : t("result.proxyNo"),
      facts.is_proxy ? "bad" : "ok",
    ],
    [t("result.owner"), facts.owner_kind, ownerOk ? "ok" : "warn"],
    [
      t("result.privileges"),
      detected,
      powers.present.filter((p) => p !== "pause").length ? "warn" : "ok",
    ],
    [
      t("result.paused"),
      facts.paused ? t("result.yesHalted") : t("result.no"),
      facts.paused ? "bad" : "ok",
    ],
  );
  return (
    <div className="card">
      <h3>{t("result.verified")}</h3>
      {rows.map(([k, v, cls]) => (
        <div className="row" key={k}>
          <span className="k">{k}</span>
          <span className={`v ${cls}`}>{v}</span>
        </div>
      ))}
      <div className="row">
        <span className="k">{t("result.contract")}</span>
        <span className="v">
          <a
            href={`${facts.chain.explorer}/token/${facts.contract}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--acc)" }}
          >
            <code>{short(facts.contract)} ↗</code>
          </a>
        </span>
      </div>
    </div>
  );
}

function WatchtowerFeed({
  alerts,
  hasAiProvider,
  eventCount,
}: {
  alerts: Verdict[] | null;
  hasAiProvider: boolean;
  eventCount: number;
}) {
  const { t } = useLanguage();
  return (
    <div className="card feed">
      <h3>{t("result.watchtower")}</h3>
      {alerts && alerts.length > 0 ? (
        alerts.map((a, i) => (
          <div className="ev" key={i}>
            <span>{a.emoji}</span>
            <span>
              <span className={`sev ${SEV_CLASS[a.severity]}`}>
                {a.severity.toUpperCase()}
              </span>{" "}
              <span className="body">{a.headline}</span>{" "}
              <span className="why">{a.why_it_matters}</span>
            </span>
          </div>
        ))
      ) : (
        <p className="mut" style={{ margin: 0, fontSize: 13.5 }}>
          {hasAiProvider
            ? `${eventCount} ${t("result.eventsNoAi")}`
            : `${eventCount} ${t("result.events")}`}
        </p>
      )}
    </div>
  );
}

/* ---------------- tooltip ---------------- */
// Inline glossary term with a hover/focus tooltip. Focusable and dismissible for a11y.
function Tip({ term, children }: { term: string; children: ReactNode }) {
  return (
    <span
      className="tip"
      tabIndex={0}
      role="button"
      aria-label={`What is ${term}?`}
    >
      {term}
      <span className="tip-box" role="tooltip">
        {children}
      </span>
    </span>
  );
}

/* ---------------- report markdown ---------------- */
// Renders the constrained Markdown the AI Auditor emits (bold section headers,
// inline **bold**, `code`, and bullet lists) as real elements — safely, without
// dangerouslySetInnerHTML (React escapes all text nodes).
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+?)`/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) nodes.push(<strong key={key++}>{m[1]}</strong>);
    else nodes.push(<code key={key++}>{m[2]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function ReportMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;
  const flushList = () => {
    if (!list.length) return;
    const items = list;
    blocks.push(
      <ul key={key++}>
        {items.map((li, i) => (
          <li key={i}>{renderInline(li)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flushList();
    // A whole-line **bold** (optionally prefixed by "#"s or "N.") is a section header.
    const boldHead = line.match(/^(?:#{1,4}\s+|\d+\.\s+)?\*\*(.+?)\*\*[:.]?$/);
    const mdHead = line.match(/^#{1,4}\s+(.*)$/);
    if (boldHead) blocks.push(<h4 key={key++}>{renderInline(boldHead[1])}</h4>);
    else if (mdHead)
      blocks.push(<h4 key={key++}>{renderInline(mdHead[1])}</h4>);
    else blocks.push(<p key={key++}>{renderInline(line)}</p>);
  }
  flushList();
  return <div className="md">{blocks}</div>;
}

/* ---------------- utils ---------------- */
function short(addr: string) {
  return addr && addr.length > 12
    ? `${addr.slice(0, 6)}…${addr.slice(-4)}`
    : addr;
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
