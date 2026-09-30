"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MarketCoin } from "@/lib/market-data";

type Favorite = { cmc_id: number; created_at: string };
type Alert = { id: string; cmc_id: number; condition: string; threshold: number; is_active: boolean };
type AlertEvent = { id: string; cmc_id: number; condition: string; threshold: number; observed_value: number; created_at: string };
type Tab = "market" | "movers" | "latest" | "watchlist" | "alerts";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: 5 });
const compactCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
const conditionLabel: Record<string, string> = { price_above: "Price rises above", price_below: "Price falls below", change_above: "24h change exceeds", change_below: "24h change falls below −" };

export function MarketDashboard() {
  const [tab, setTab] = useState<Tab>("market");
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [latest, setLatest] = useState<MarketCoin[]>([]);
  const [savedCoins, setSavedCoins] = useState<MarketCoin[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pageStart, setPageStart] = useState(1);
  const [selected, setSelected] = useState<MarketCoin | null>(null);
  const [condition, setCondition] = useState("price_above");
  const [threshold, setThreshold] = useState("");

  async function loadMarket(start = pageStart) {
    setError("");
    try {
      const [marketResponse, latestResponse] = await Promise.all([fetch(`/api/market?start=${start}`), start === 1 ? fetch("/api/market?view=latest") : Promise.resolve(null)]);
      const marketData = await marketResponse.json(); const latestData = latestResponse ? await latestResponse.json() : null;
      if (!marketResponse.ok) throw new Error(marketData.error || "Unable to load market data.");
      setCoins(marketData.coins); if (latestResponse?.ok && latestData) setLatest(latestData.coins);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load market data."); }
  }

  async function loadAccount() {
    const [meResponse, watchResponse, alertResponse] = await Promise.all([fetch("/api/auth/me"), fetch("/api/watchlist"), fetch("/api/alerts")]);
    const me = await meResponse.json(); const watch = await watchResponse.json(); const alertData = await alertResponse.json();
    setSignedIn(Boolean(me.user));
    if (watchResponse.ok) {
      const nextFavorites: Favorite[] = watch.favorites;
      setFavorites(nextFavorites);
      const ids = nextFavorites.map((favorite) => favorite.cmc_id);
      const batches = await Promise.all(Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) =>
        fetch(`/api/market?ids=${ids.slice(index * 100, (index + 1) * 100).join(",")}`).then((r) => r.ok ? r.json() : { coins: [] })
      ));
      setSavedCoins(batches.flatMap((batch) => batch.coins as MarketCoin[]));
    }
    if (alertResponse.ok) { setAlerts(alertData.alerts); setEvents(alertData.events); }
  }

  useEffect(() => { void loadMarket(pageStart); }, [pageStart]);
  useEffect(() => { void loadAccount(); }, []);

  const coinById = useMemo(() => new Map([...coins, ...latest, ...savedCoins].map((coin) => [coin.id, coin])), [coins, latest, savedCoins]);
  const list = useMemo(() => {
    if (tab === "latest") return latest;
    if (tab === "movers") return [...coins].sort((a, b) => b.change24h - a.change24h);
    if (tab === "watchlist") return favorites.map((favorite) => coinById.get(favorite.cmc_id)).filter((coin): coin is MarketCoin => Boolean(coin));
    return coins;
  }, [tab, coins, latest, favorites, coinById]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? list.filter((coin) => coin.name.toLowerCase().includes(needle) || coin.symbol.toLowerCase().includes(needle)) : list;
  }, [list, query]);
  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.cmc_id)), [favorites]);

  async function toggleFavorite(coin: MarketCoin) {
    if (!signedIn) { window.location.href = "/account"; return; }
    setBusy(true); setError("");
    try {
      const response = favoriteIds.has(coin.id)
        ? await fetch(`/api/watchlist?cmcId=${coin.id}`, { method: "DELETE" })
        : await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cmcId: coin.id }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      await loadAccount();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update watchlist."); }
    finally { setBusy(false); }
  }

  async function createAlert(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return;
    const parsed = Number(threshold);
    const normalizedThreshold = condition.startsWith("change_") && condition === "change_below" ? Math.abs(parsed) : parsed;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cmcId: selected.id, condition, threshold: normalizedThreshold }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setSelected(null); setThreshold(""); await loadAccount(); setTab("alerts");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create alert."); }
    finally { setBusy(false); }
  }

  async function removeAlert(id: string) {
    const response = await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    if (!response.ok) { const data = await response.json(); setError(data.error); return; }
    await loadAccount();
  }

  const tabs: Array<[Tab, string]> = [["market", "Top market"], ["movers", "Top movers"], ["latest", "Recently listed"], ["watchlist", "My watchlist"], ["alerts", "Alerts"]];
  return <>
    <section className="markets-heading">
      <div><p className="section-kicker">Market discovery</p><h1>Track the market. <span className="grad">Keep your own watch.</span></h1><p className="mut">Explore market metrics, save favorites across devices, and set threshold alerts.</p></div>
      <div className="market-account"><span className="freshness-dot" /> Market data · updated about every minute <Link href={signedIn ? "/account" : "/account"}>{signedIn ? "Account" : "Sign in"}</Link></div>
    </section>
    <section className="market-insights" aria-label="Market discovery lists">
      <button className={`insight-card ${tab === "movers" ? "selected" : ""}`} onClick={() => setTab("movers")}><span>TOP MOVERS</span><strong>{coins[0]?.symbol ?? "—"}</strong><small>Ranked by 24h change in the loaded market list</small></button>
      <button className={`insight-card ${tab === "latest" ? "selected" : ""}`} onClick={() => setTab("latest")}><span>RECENTLY LISTED</span><strong>{latest[0]?.symbol ?? "—"}</strong><small>Latest CoinMarketCap listings</small></button>
      <button className={`insight-card ${tab === "watchlist" ? "selected" : ""}`} onClick={() => setTab("watchlist")}><span>YOUR WATCHLIST</span><strong>{favorites.length} saved</strong><small>{signedIn ? "Synced to your account" : "Sign in to save across devices"}</small></button>
    </section>
    <section className="market-panel">
      <div className="market-toolbar"><div className="market-tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}{id === "alerts" && events.length > 0 ? ` (${events.length})` : ""}</button>)}</div>
        {tab !== "alerts" && <input className="input market-search" placeholder="Search name or ticker" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tokens" />}</div>
      {error && <p className="err market-error" role="alert">{error}</p>}
      {tab === "alerts" ? <div className="alerts-layout">
        <div><h2>Active thresholds</h2>{!signedIn ? <p className="mut">Sign in to create and sync alerts. <Link href="/account">Sign in →</Link></p> : alerts.length === 0 ? <p className="mut">No alerts yet. Add one from any token row.</p> : <div className="alert-list">{alerts.map((alert) => { const coin = coinById.get(alert.cmc_id); return <div className="alert-row" key={alert.id}><div><b>{coin?.name ?? `CMC #${alert.cmc_id}`}</b><p>{conditionLabel[alert.condition]} {alert.condition.startsWith("price_") ? currency.format(alert.threshold) : `${alert.threshold}%`}</p></div><button className="linkbtn" onClick={() => removeAlert(alert.id)}>Remove</button></div>; })}</div>}</div>
        <div><h2>Recent notifications</h2>{events.length === 0 ? <p className="mut">Alert notifications will appear here after the scheduled checker detects a threshold crossing.</p> : <div className="alert-list">{events.map((item) => <div className="alert-row" key={item.id}><div><b>{coinById.get(item.cmc_id)?.name ?? `CMC #${item.cmc_id}`}</b><p>{conditionLabel[item.condition]} · observed {item.condition.startsWith("price_") ? currency.format(item.observed_value) : `${item.observed_value.toFixed(2)}%`}</p></div><time>{new Date(item.created_at).toLocaleString()}</time></div>)}</div>}</div>
      </div> : <>
        <div className="market-title"><div><h2>{tabs.find(([id]) => id === tab)?.[1]}</h2><p className="mut">{tab === "movers" ? `Largest positive 24-hour changes among assets ${pageStart}–${pageStart + 99} by market capitalization.` : tab === "latest" ? "Recently added assets listed by CoinMarketCap. Listing order is not a quality signal." : tab === "watchlist" ? "Your account-synced favorites." : `Assets ${pageStart}–${pageStart + 99}, ranked by market capitalization.`}</p></div><span className="mut">{filtered.length} assets</span></div>
        {tab === "watchlist" && !signedIn && <div className="signin-banner">Sign in to save favorites and sync them across your devices. <Link href="/account">Sign in or create account →</Link></div>}
        {filtered.length === 0 ? <div className="empty-state">{error ? "Market data could not be loaded." : tab === "watchlist" && signedIn ? "No favorites yet. Browse the market and tap ☆ to save a token." : "No matching tokens."}</div> : <div className="market-table-scroll"><table className="market-table"><thead><tr><th>#</th><th>Asset</th><th>Price</th><th>24h</th><th>Market cap</th><th>24h volume</th><th>Updated</th><th aria-label="Actions" /></tr></thead><tbody>{filtered.map((coin) => <tr key={coin.id}><td className="rank">{coin.cmcRank ?? "—"}</td><td><div className="coin-name"><span className="coin-badge">{coin.symbol.slice(0, 1)}</span><span><b>{coin.name}</b><small>{coin.symbol}</small></span></div></td><td>{currency.format(coin.price)}</td><td className={coin.change24h >= 0 ? "positive" : "negative"}>{coin.change24h >= 0 ? "+" : ""}{coin.change24h.toFixed(2)}%</td><td>{compactCurrency.format(coin.marketCap)}</td><td>{compactCurrency.format(coin.volume24h)}</td><td className="mut">{new Date(coin.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td><td><div className="coin-actions"><button className={`favorite-btn ${favoriteIds.has(coin.id) ? "saved" : ""}`} title={favoriteIds.has(coin.id) ? "Remove from favorites" : "Add to favorites"} aria-label={favoriteIds.has(coin.id) ? `Remove ${coin.name} from watchlist` : `Add ${coin.name} to watchlist`} disabled={busy} onClick={() => toggleFavorite(coin)}>{favoriteIds.has(coin.id) ? "★" : "☆"}</button><button className="alert-btn" disabled={!signedIn} title={signedIn ? "Create price alert" : "Sign in to create alerts"} onClick={() => setSelected(coin)}>Alert</button></div></td></tr>)}</tbody></table></div>}
        {(tab === "market" || tab === "movers") && <div className="market-pagination"><button className="btn btn-ghost btn-sm" disabled={pageStart === 1} onClick={() => setPageStart(Math.max(1, pageStart - 100))}>← Previous</button><span className="mut">Showing {pageStart}–{pageStart + 99}</span><button className="btn btn-ghost btn-sm" onClick={() => setPageStart(pageStart + 100)}>Next →</button></div>}
      </>}
    </section>
    <p className="market-disclaimer">Market rankings and changes are descriptive snapshots, not investment recommendations. Data is provided by CoinMarketCap and may be delayed or revised. Research token identity and contract risks before interacting.</p>
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}><section className="alert-modal" role="dialog" aria-modal="true" aria-labelledby="alert-modal-title"><button className="modal-close" aria-label="Close" onClick={() => setSelected(null)}>×</button><p className="section-kicker">Price alert</p><h2 id="alert-modal-title">{selected.name} ({selected.symbol})</h2><form onSubmit={createAlert}><label>Alert condition<select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}><option value="price_above">Price rises above</option><option value="price_below">Price falls below</option><option value="change_above">24h change rises above</option><option value="change_below">24h change falls below</option></select></label><label>{condition.startsWith("price_") ? "USD price" : "Percentage"}<input className="input" type="number" min="0.00000001" step="any" required value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder={condition.startsWith("price_") ? String(selected.price) : "5"} /></label><div className="alert-modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button><button className="btn btn-primary" disabled={busy || !threshold}>Save alert</button></div></form></section></div>}
  </>;
}
