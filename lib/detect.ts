// TrustLens · detect — auto-detect where a pasted address lives and what it is.
// Probes every configured chain in parallel (bytecode → standard), then resolves
// multi-chain hits by CHAINS priority order (Polygon first, so the demo stays put).

import { CHAINS, rpc, toChainInfo, type ChainConfig } from "./chains";
import { detectStandard } from "./standards";
import type { ChainInfo, Standard } from "./types";

export interface DetectionHit {
  config: ChainConfig; // full config (carries rpcs) for the chosen chain
  chain: ChainInfo; // display slice
  standard: Standard;
}

export interface DetectionResult {
  chosen: DetectionHit | null;
  alsoFoundOn: ChainInfo[]; // other chains where a recognized token was found
  reachable: boolean; // at least one chain answered (distinguishes "not found" from "offline")
}

async function probeChain(
  config: ChainConfig,
  contract: string,
): Promise<{ config: ChainConfig; standard: Standard | null; reachable: boolean }> {
  try {
    const code = await rpc(config.rpcs, "eth_getCode", [contract, "latest"]);
    if (!code || code === "0x" || code === "0x0") {
      return { config, standard: null, reachable: true }; // EOA / no contract here
    }
    const standard = await detectStandard(config.rpcs, contract);
    return { config, standard, reachable: true };
  } catch {
    return { config, standard: null, reachable: false }; // this chain's RPCs failed
  }
}

export async function detectAddress(contract: string, requestedChainId?: number): Promise<DetectionResult> {
  const targets = requestedChainId === undefined ? CHAINS : CHAINS.filter((chain) => chain.id === requestedChainId);
  const results = await Promise.all(targets.map((c) => probeChain(c, contract)));

  const reachable = results.some((r) => r.reachable);
  // CHAINS is already in priority order; the first hit with a recognized standard wins.
  const hits = results.filter((r) => r.standard !== null);

  if (hits.length === 0) {
    return { chosen: null, alsoFoundOn: [], reachable };
  }

  const [first, ...rest] = hits;
  return {
    chosen: {
      config: first.config,
      chain: toChainInfo(first.config),
      standard: first.standard as Standard,
    },
    alsoFoundOn: rest.map((r) => toChainInfo(r.config)),
    reachable,
  };
}
