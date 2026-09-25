import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { chainById } from "@/lib/chains";
import { insertReview, listMonitorEvents, listReviews } from "@/lib/review-store";
import { runContractAnalysis } from "@/lib/run-analysis";
import { getTrustAsset } from "@/lib/trust-assets";
import type { AnalyzeResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function authorized() {
  try { return await hasAdminSession(); }
  catch { return false; }
}

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  try {
    const [reviews, events] = await Promise.all([listReviews(), listMonitorEvents()]);
    return NextResponse.json({ reviews, events });
  } catch {
    return NextResponse.json({ error: "Review storage is unavailable. Check the server configuration and database migration." }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!await authorized()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  const length = Number(req.headers.get("content-length") || "0");
  if (length > 8_192) return NextResponse.json({ error: "Review request is too large." }, { status: 413 });
  let body: { assetSlug?: unknown; address?: unknown; chainId?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const assetSlug = body.assetSlug;
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const chainId = Number(body.chainId);
  if ((assetSlug !== "sut" && assetSlug !== "msq") || !getTrustAsset(assetSlug)) return NextResponse.json({ error: "Select a supported project profile." }, { status: 400 });
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return NextResponse.json({ error: "Enter a valid contract address." }, { status: 400 });
  if (!Number.isInteger(chainId) || !chainById(chainId)) return NextResponse.json({ error: "Select a supported network." }, { status: 400 });
  let result: AnalyzeResult;
  try {
    result = await runContractAnalysis(address, chainId, "en");
  } catch (error) {
    if (error instanceof Error && "status" in error && typeof error.status === "number") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Contract analysis failed. Check RPC availability and try again." }, { status: 502 });
  }
  try {
    const review = await insertReview({ asset_slug: assetSlug, address: address.toLowerCase(), chain_id: chainId, result });
    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save the review. Check storage configuration." }, { status: 503 });
  }
}
