// POST /api/analyze { address, source?, chainId?, language? } -> AnalyzeResult
import { NextRequest, NextResponse } from "next/server";
import { chainById } from "@/lib/chains";
import { runContractAnalysis } from "@/lib/run-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const length = Number(req.headers.get("content-length") || "0");
  if (length > 1_000_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let body: { address?: unknown; source?: unknown; chainId?: unknown; language?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  const source = typeof body.source === "string" ? body.source : undefined;
  const language = body.language === "ko" ? "ko" : "en";
  const requestedChainId = body.chainId === undefined ? undefined : Number(body.chainId);
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return NextResponse.json({ error: "Enter a valid contract address (0x + 40 hex chars)." }, { status: 400 });
  if (source && source.length > 60_000) return NextResponse.json({ error: "Verified source must be 60,000 characters or fewer." }, { status: 413 });
  if (requestedChainId !== undefined && (!Number.isInteger(requestedChainId) || !chainById(requestedChainId))) return NextResponse.json({ error: "Unsupported network." }, { status: 400 });

  try {
    return NextResponse.json(await runContractAnalysis(address, requestedChainId, language, source), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && "status" in error && typeof error.status === "number") {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Contract analysis failed. Check RPC availability and try again." }, { status: 502 });
  }
}
