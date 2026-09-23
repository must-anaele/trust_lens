import { NextRequest, NextResponse } from "next/server";
import { chainById } from "@/lib/chains";
import { reviewWallet } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { address?: unknown; chainId?: unknown; consent?: unknown; language?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  const korean = body.language === "ko";
  const chainId = Number(body.chainId);
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: korean ? "올바른 EVM 지갑 주소를 입력하세요." : "Enter a valid EVM wallet address." }, { status: 400 });
  }
  if (!body.consent) {
    return NextResponse.json({ error: korean ? "조회 전에 공개 체인 데이터 안내를 확인해 주세요." : "Please confirm the public-chain data notice before scanning." }, { status: 400 });
  }
  const chain = chainById(chainId);
  if (!chain) {
    return NextResponse.json({ error: korean ? "지원되는 네트워크를 선택하세요." : "Select a supported network." }, { status: 400 });
  }

  try {
    const result = await reviewWallet(chain, address);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet review failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
