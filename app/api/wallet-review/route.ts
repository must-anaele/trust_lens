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
  if (body.consent !== true) {
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
    if (/specify an address|address in your request/i.test(message)) {
      return NextResponse.json({
        error: `${chain.name} RPC provider requires a contract address filter for log searches. Wallet review searches approval events across contracts, so configure an RPC provider that supports topic-filtered eth_getLogs requests without a contract address. Details: ${message}`,
      }, { status: 502 });
    }
    if (message.startsWith("All ") && message.includes("RPC endpoints failed")) {
      const rpcVariable = ({
        137: "POLYGON_RPC_URLS", 1: "ETHEREUM_RPC_URLS", 8453: "BASE_RPC_URLS",
        42161: "ARBITRUM_RPC_URLS", 10: "OPTIMISM_RPC_URLS", 56: "BNB_RPC_URLS",
      } as Record<number, string>)[chain.id];
      if (message.includes("HTTP 403") || message.includes("HTTP 401")) {
        return NextResponse.json({
          error: `${chain.name} RPC provider rejected the request. Check that ${rpcVariable} contains a valid endpoint for this network, its API key is active, and the provider allows requests from this server. Update .env.local and restart the server. Details: ${message}`,
        }, { status: 502 });
      }
      return NextResponse.json({
        error: `Could not reach ${chain.name} RPC endpoints. Check the server's outbound network access or configure ${rpcVariable} in .env.local. Details: ${message}`,
      }, { status: 502 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
