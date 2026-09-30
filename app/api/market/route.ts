import { NextRequest, NextResponse } from "next/server";
import { getLatestListings, getMarketListings, getQuotesById } from "@/lib/market-data";

export async function GET(request: NextRequest) {
  const sort = request.nextUrl.searchParams.get("sort");
  const view = request.nextUrl.searchParams.get("view");
  try {
    const rawIds = request.nextUrl.searchParams.get("ids");
    if (rawIds) {
      const ids = [...new Set(rawIds.split(",").map(Number))];
      if (ids.length > 100 || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) return NextResponse.json({ error: "Request up to 100 valid market IDs." }, { status: 400 });
      return NextResponse.json({ coins: await getQuotesById(ids) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
    }
    if (view === "latest") return NextResponse.json({ coins: await getLatestListings() }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
    const safeSort = sort === "volume_24h" || sort === "percent_change_24h" ? sort : "market_cap";
    const start = Number(request.nextUrl.searchParams.get("start") ?? 1);
    if (!Number.isSafeInteger(start) || start < 1 || start > 1000000) return NextResponse.json({ error: "Invalid page." }, { status: 400 });
    return NextResponse.json({ coins: await getMarketListings(100, safeSort, start) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Market data is temporarily unavailable." }, { status: 503 });
  }
}
