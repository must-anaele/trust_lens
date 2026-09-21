// TrustLens · chains — supported EVM chains + the generic JSON-RPC caller.
// RPC endpoint lists live here (server-side only). Only ChainInfo (no rpcs) is
// ever serialized to the browser via AnalyzeResult.

import type { ChainInfo } from "./types";

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  rpcs: string[]; // public, no-key endpoints; tried in order (failover)
  explorer: string;
  nativeSymbol: string;
}

// Curated set of public no-key EVM chains. Polygon is first so it stays the
// default when the same address is recognized on several chains.
export const CHAINS: ChainConfig[] = [
  {
    id: 137,
    name: "Polygon PoS",
    shortName: "Polygon",
    rpcs: [
      "https://polygon.drpc.org",
      "https://polygon-bor-rpc.publicnode.com",
      "https://polygon.llamarpc.com",
    ],
    explorer: "https://polygonscan.com",
    nativeSymbol: "POL",
  },
  {
    id: 1,
    name: "Ethereum Mainnet",
    shortName: "Ethereum",
    rpcs: [
      "https://eth.drpc.org",
      "https://ethereum-rpc.publicnode.com",
      "https://eth.llamarpc.com",
    ],
    explorer: "https://etherscan.io",
    nativeSymbol: "ETH",
  },
  {
    id: 8453,
    name: "Base",
    shortName: "Base",
    rpcs: [
      "https://base.drpc.org",
      "https://base-rpc.publicnode.com",
      "https://mainnet.base.org",
    ],
    explorer: "https://basescan.org",
    nativeSymbol: "ETH",
  },
  {
    id: 42161,
    name: "Arbitrum One",
    shortName: "Arbitrum",
    rpcs: [
      "https://arbitrum.drpc.org",
      "https://arbitrum-one-rpc.publicnode.com",
      "https://arb1.arbitrum.io/rpc",
    ],
    explorer: "https://arbiscan.io",
    nativeSymbol: "ETH",
  },
  {
    id: 10,
    name: "OP Mainnet",
    shortName: "Optimism",
    rpcs: [
      "https://optimism.drpc.org",
      "https://optimism-rpc.publicnode.com",
      "https://mainnet.optimism.io",
    ],
    explorer: "https://optimistic.etherscan.io",
    nativeSymbol: "ETH",
  },
  {
    id: 56,
    name: "BNB Smart Chain",
    shortName: "BNB Chain",
    rpcs: [
      "https://bsc.drpc.org",
      "https://bsc-rpc.publicnode.com",
      "https://binance.llamarpc.com",
    ],
    explorer: "https://bscscan.com",
    nativeSymbol: "BNB",
  },
];

export function toChainInfo(c: ChainConfig): ChainInfo {
  return {
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    explorer: c.explorer,
    nativeSymbol: c.nativeSymbol,
  };
}

export function chainById(id: number): ChainConfig | undefined {
  return CHAINS.find((c) => c.id === id);
}

// Generic JSON-RPC call with per-chain endpoint failover. Throws only when every
// endpoint for the chain fails (so callers can distinguish "chain unreachable").
export async function rpc(
  rpcs: string[],
  method: string,
  params: unknown[],
): Promise<any> {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  let last: unknown = null;
  for (const url of rpcs) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      if ("result" in data) return data.result;
      last = data.error ?? data;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`All RPC endpoints failed: ${JSON.stringify(last)}`);
}

// eth_call helper: returns null when the selector reverts / doesn't exist.
export async function ethCall(
  rpcs: string[],
  contract: string,
  data: string,
): Promise<string | null> {
  try {
    return await rpc(rpcs, "eth_call", [{ to: contract, data }, "latest"]);
  } catch {
    return null;
  }
}
