export type MarketCoin = {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmcRank: number | null;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  circulatingSupply: number | null;
  lastUpdated: string;
};

const CMC_BASE = "https://pro-api.coinmarketcap.com";

function cmcKey() {
  const key = process.env.COINMARKETCAP_API_KEY;
  if (!key) throw new Error("Market data is not configured. Set COINMARKETCAP_API_KEY on the server.");
  return key;
}

async function cmc<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${CMC_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { "X-CMC_PRO_API_KEY": cmcKey(), Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) throw new Error("CoinMarketCap rejected the API key or plan.");
    if (status === 429) throw new Error("Market data is temporarily rate limited. Please try again shortly.");
    throw new Error(`CoinMarketCap request failed (${status}).`);
  }
  const body = await response.json();
  if (body.status?.error_code) throw new Error(body.status.error_message || "CoinMarketCap request failed.");
  return body.data as T;
}

type CmcAsset = {
  id: number; name: string; symbol: string; slug: string; cmc_rank: number | null;
  quote: { USD: { price: number; market_cap: number; volume_24h: number; percent_change_24h: number; last_updated: string } } | Array<{ symbol: string; price: number; market_cap: number; volume_24h: number; percent_change_24h: number; last_updated: string }>;
  circulating_supply?: number;
};

function mapAsset(asset: CmcAsset): MarketCoin {
  const usd = Array.isArray(asset.quote) ? asset.quote.find((quote) => quote.symbol === "USD") : asset.quote.USD;
  if (!usd) throw new Error("CoinMarketCap returned a quote without USD values.");
  return {
    id: asset.id, name: asset.name, symbol: asset.symbol, slug: asset.slug, cmcRank: asset.cmc_rank,
    price: usd.price, marketCap: usd.market_cap, volume24h: usd.volume_24h,
    change24h: usd.percent_change_24h, circulatingSupply: asset.circulating_supply ?? null,
    lastUpdated: usd.last_updated,
  };
}

export async function getMarketListings(limit = 100, sort: "market_cap" | "volume_24h" | "percent_change_24h" = "market_cap", start = 1) {
  const data = await cmc<CmcAsset[]>("/v3/cryptocurrency/listings/latest", {
    start: String(Math.max(1, Math.floor(start))), limit: String(Math.min(200, Math.max(1, limit))), convert: "USD", sort: "market_cap",
    sort_dir: "desc", aux: "cmc_rank,circulating_supply",
  });
  const coins = data.map(mapAsset);
  if (sort === "volume_24h") return coins.sort((a, b) => b.volume24h - a.volume24h);
  if (sort === "percent_change_24h") return coins.sort((a, b) => b.change24h - a.change24h);
  return coins;
}

export async function getLatestListings(limit = 20) {
  const data = await cmc<CmcAsset[]>("/v1/cryptocurrency/listings/new", {
    start: "1", limit: String(Math.min(50, Math.max(1, limit))), convert: "USD", sort_dir: "desc",
  });
  return data.map(mapAsset);
}

export async function getQuotesById(ids: number[]) {
  if (!ids.length) return [] as MarketCoin[];
  const data = await cmc<CmcAsset[]>("/v3/cryptocurrency/quotes/latest", { id: ids.join(","), convert: "USD", aux: "cmc_rank,circulating_supply" });
  return data.map(mapAsset);
}
