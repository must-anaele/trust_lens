// TrustLens · collect — live on-chain evidence (facts + recent transfers).
// No API key. Chain- and standard-aware: every call takes the chain's RPC list
// (from lib/chains) and the detected token standard (from lib/standards).

import { ethCall, rpc, type ChainConfig } from "./chains";
import { SEL, SPECS } from "./standards";
import type { ChainInfo, Facts, Powers, Standard, TransferEvent } from "./types";

const EIP1967_IMPL =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
<<<<<<< HEAD
const EIP1967_ADMIN =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
=======
>>>>>>> origin/main
const ZERO = "0x0000000000000000000000000000000000000000";

// tokenURI(uint256) and uri(uint256) selectors for NFT metadata sampling.
const TOKEN_URI = "0xc87b56dd";
const URI = "0x0e89341c";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

function decodeString(hex: string | null): string | null {
  if (!hex || hex.length <= 2) return null;
  const b = hexToBytes(hex);
  if (b.length >= 64) {
    let len = 0;
    for (let i = 32; i < 64; i++) len = len * 256 + b[i];
    const s = new TextDecoder().decode(b.slice(64, 64 + len));
    return s || null;
  }
  const s = new TextDecoder().decode(b).replace(/ +$/, "");
  return s || null;
}

function decodeBigInt(hex: string | null): bigint | null {
  return hex && hex !== "0x" ? BigInt(hex) : null;
}

function decodeAddr(hex: string | null): string | null {
  return hex && hex.length >= 42 ? "0x" + hex.slice(-40) : null;
}

export async function collectFacts(
  config: ChainConfig,
  chain: ChainInfo,
  standard: Standard,
  contract: string,
): Promise<Facts> {
  const rpcs = config.rpcs;
  const raw: Record<string, string | null> = {};
  for (const [k, sel] of Object.entries(SEL)) {
    if (k === "balanceOf") continue; // probe-only selector, not a fact
    raw[k] = await ethCall(rpcs, contract, sel);
  }

  let owner = decodeAddr(raw.owner) ?? decodeAddr(raw.getOwner);
  let ownerKind = "none / renounced (0x0)";
  if (owner && owner !== ZERO) {
    const code = await rpc(rpcs, "eth_getCode", [owner, "latest"]);
    ownerKind =
      code && code !== "0x" && code !== "0x0"
        ? "contract (multisig/timelock?)"
        : "EOA (single key)";
  }

  const impl = await rpc(rpcs, "eth_getStorageAt", [contract, EIP1967_IMPL, "latest"]);
  const isProxy = !!(impl && BigInt(impl) !== 0n);
<<<<<<< HEAD
  const adminSlot = isProxy ? await rpc(rpcs, "eth_getStorageAt", [contract, EIP1967_ADMIN, "latest"]) : null;
  const proxyImplementation = isProxy ? decodeAddr(impl) : null;
  const proxyAdmin = adminSlot ? decodeAddr(adminSlot) : null;
=======
>>>>>>> origin/main
  const tokenCode = await rpc(rpcs, "eth_getCode", [contract, "latest"]);

  // Standard-specific metadata.
  let decimals: number | null = null;
  let total: bigint | null = null;
  let totalHuman: number | null = null;
  let tokenUriSample: string | null = null;

  if (standard === "erc20") {
    decimals = (() => {
      const d = decodeBigInt(raw.decimals);
      return d !== null ? Number(d) : null;
    })();
    total = decodeBigInt(raw.totalSupply);
    totalHuman =
      total !== null && decimals !== null ? Number(total / 10n ** BigInt(decimals)) : null;
  } else if (standard === "erc721") {
    // Sample tokenURI(1) as a metadata probe (decodeString handles ABI strings).
    tokenUriSample = decodeString(await ethCall(rpcs, contract, TOKEN_URI + "0".repeat(63) + "1"));
  } else {
    // erc1155: sample uri(0)
    tokenUriSample = decodeString(await ethCall(rpcs, contract, URI + "0".repeat(64)));
  }

  const pausedHex = raw.paused;

  return {
    contract,
    chain,
    standard,
    name: decodeString(raw.name),
    symbol: decodeString(raw.symbol),
    ...(standard === "erc20"
      ? { decimals, total_supply_raw: total !== null ? total.toString() : null, total_supply: totalHuman }
      : {}),
    ...(standard !== "erc20" ? { token_uri_sample: tokenUriSample } : {}),
    owner: owner ?? ZERO,
    owner_kind: ownerKind,
    paused: pausedHex !== null && pausedHex !== "0x" && BigInt(pausedHex) === 1n,
    is_proxy: isProxy,
<<<<<<< HEAD
    proxy_implementation: proxyImplementation && proxyImplementation !== ZERO ? proxyImplementation : null,
    proxy_admin: proxyAdmin && proxyAdmin !== ZERO ? proxyAdmin : null,
=======
>>>>>>> origin/main
    bytecode_bytes:
      typeof tokenCode === "string" ? (tokenCode.length - 2) / 2 : null,
  };
}

export async function scanPowers(
  config: ChainConfig,
  standard: Standard,
  contract: string,
  ownerRenounced: boolean,
  isProxy: boolean,
): Promise<Powers> {
  let bc = "";
  try {
    const code = await rpc(config.rpcs, "eth_getCode", [contract, "latest"]);
    bc = typeof code === "string" ? code.slice(2).toLowerCase() : "";
  } catch {
    bc = "";
  }
  const any = (sels: string[]) => sels.some((s) => bc.includes(s));
  const priv = SPECS[standard].privSelectors;

  const has_mint = priv.mint ? any(priv.mint) : false;
  const has_pause = priv.pause ? any(priv.pause) : false;
  const has_accesscontrol = priv.accesscontrol ? any(priv.accesscontrol) : false;
  const has_metadata_mutable = priv.metadata ? any(priv.metadata) : false;
  // Burn/blacklist/fee are ERC-20 idioms only.
  const has_burn = standard === "erc20" && priv.burn ? any(priv.burn) : false;
  const has_blacklist = standard === "erc20" && priv.blacklist ? any(priv.blacklist) : false;
  const has_fee_hint = standard === "erc20" && priv.fee ? any(priv.fee) : false;

  // Can pause actually be called? onlyOwner + renounced owner ⇒ bricked.
  let pause_callable: boolean | null = null;
  if (has_pause) pause_callable = has_accesscontrol ? null : !ownerRenounced;

  const present: string[] = [];
  if (has_mint) present.push("mint");
  if (has_burn) present.push("burn");
  if (has_pause) present.push("pause");
  if (has_accesscontrol) present.push("roles");
  if (has_blacklist) present.push("blacklist");
  if (has_fee_hint) present.push("fee?");
  if (has_metadata_mutable) present.push("metadata-mutable");

  return {
    bytecode_bytes: bc ? bc.length / 2 : null,
    has_mint, has_burn, has_pause, has_fee_hint, has_blacklist, has_accesscontrol,
    has_metadata_mutable,
    is_proxy: isProxy, owner_renounced: ownerRenounced, pause_callable, present,
  };
}

export async function recentTransfers(
  config: ChainConfig,
  standard: Standard,
  contract: string,
  decimals: number | undefined,
  blocks = 1500,
  limit = 8,
): Promise<TransferEvent[]> {
  let logs: any;
  try {
    const head = Number(BigInt(await rpc(config.rpcs, "eth_blockNumber", [])));
    logs = await rpc(config.rpcs, "eth_getLogs", [
      {
        address: contract,
        fromBlock: "0x" + Math.max(0, head - blocks).toString(16),
        toBlock: "latest",
        topics: [SPECS[standard].transferTopics],
      },
    ]);
  } catch {
    return []; // public RPCs cap ranges/results — degrade quietly
  }
  if (!Array.isArray(logs)) return [];

  const out: TransferEvent[] = [];
  for (const lg of logs.slice(-limit)) {
    const topics: string[] = lg.topics ?? [];
    if (topics.length < 3) continue;

    if (standard === "erc20" && topics.length === 3) {
      // ERC-20 Transfer: value in data (decimals-scaled).
      const amount =
        lg.data && lg.data !== "0x"
          ? Number(BigInt(lg.data) / 10n ** BigInt(decimals ?? 18))
          : 0;
      out.push({
        type: "Transfer", kind: "erc20",
        from: "0x" + topics[1].slice(-40), to: "0x" + topics[2].slice(-40),
        amount, block: Number(BigInt(lg.blockNumber)), tx: lg.transactionHash ?? null,
      });
    } else if (standard === "erc721" && topics.length === 4) {
      // ERC-721 Transfer: tokenId is the 3rd indexed param.
      out.push({
        type: "Transfer", kind: "erc721",
        from: "0x" + topics[1].slice(-40), to: "0x" + topics[2].slice(-40),
        tokenId: BigInt(topics[3]).toString(),
        block: Number(BigInt(lg.blockNumber)), tx: lg.transactionHash ?? null,
      });
    } else if (standard === "erc1155" && topics.length === 4 && lg.data && lg.data !== "0x") {
      // ERC-1155 TransferSingle: data = id (word 0), value (word 1). Batch events
      // carry dynamic arrays — skip rather than mis-parse.
      const id = BigInt("0x" + lg.data.slice(2, 66)).toString();
      const value = Number(BigInt("0x" + lg.data.slice(66, 130)));
      out.push({
        type: "TransferSingle", kind: "erc1155",
        from: "0x" + topics[1].slice(-40), to: "0x" + topics[2].slice(-40),
        tokenId: id, amount: value,
        block: Number(BigInt(lg.blockNumber)), tx: lg.transactionHash ?? null,
      });
    }
  }
  return out;
}
