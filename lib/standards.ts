// TrustLens · standards — token-standard detection + per-standard config tables.
// Detection: ERC-165 supportsInterface for ERC-721/1155, functional probe for ERC-20.

import { ethCall } from "./chains";
import type { Standard } from "./types";

// keccak256 topic0 for Transfer(address,address,uint256) — shared by ERC-20 & ERC-721.
export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
// ERC-1155 event topics.
export const TRANSFER_SINGLE_TOPIC =
  "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";
export const TRANSFER_BATCH_TOPIC =
  "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb";

// ERC-165 supportsInterface(bytes4) selector + the interface ids we probe for.
const SUPPORTS_INTERFACE = "0x01ffc9a7";
const IFACE = { erc721: "80ac58cd", erc1155: "d9b67a26" } as const;

// Common metadata + admin selectors (function selector, no 0x prefix unless noted).
const SEL = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  owner: "0x8da5cb5b",
  getOwner: "0x893d20e8",
  paused: "0x5c975abb",
  balanceOf: "0x70a08231", // balanceOf(address) — ERC-20 probe
} as const;

export interface StandardSpec {
  label: string; // human label for prompts/UI
  transferTopics: string[]; // topics to query in eth_getLogs
  privSelectors: Record<string, string[]>; // 4-byte selectors (no 0x) scanned in bytecode
}

// Per-standard privileged-power selectors scanned as substrings of the runtime bytecode.
export const SPECS: Record<Standard, StandardSpec> = {
  erc20: {
    label: "ERC-20 fungible token",
    transferTopics: [TRANSFER_TOPIC],
    privSelectors: {
      mint: ["40c10f19", "a0712d68"],
      burn: ["42966c68", "9dc29fac", "79cc6790"],
      pause: ["8456cb59"],
      accesscontrol: ["91d14854", "2f2ff15d", "d5391393", "e63ab1e9", "a217fddf"],
      blacklist: ["fe575a87"],
      fee: ["437823ec", "8c0b8e2d"],
    },
  },
  erc721: {
    label: "ERC-721 NFT collection",
    transferTopics: [TRANSFER_TOPIC],
    privSelectors: {
      mint: ["40c10f19", "d204c45e", "a1448194", "6a627842"], // mint / safeMint variants
      pause: ["8456cb59"],
      accesscontrol: ["91d14854", "2f2ff15d", "d5391393", "e63ab1e9", "a217fddf"],
      metadata: ["55f804b3", "162094c4", "938e3d7b"], // setBaseURI / setTokenURI / setContractURI
    },
  },
  erc1155: {
    label: "ERC-1155 multi-token",
    transferTopics: [TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC],
    privSelectors: {
      mint: ["731133e9", "1f7fdffa"], // mint / mintBatch
      pause: ["8456cb59"],
      accesscontrol: ["91d14854", "2f2ff15d", "d5391393", "e63ab1e9", "a217fddf"],
      metadata: ["02fe5305"], // setURI
    },
  },
};

export { SEL };

async function supportsInterface(
  rpcs: string[],
  contract: string,
  ifaceId: string,
): Promise<boolean> {
  // supportsInterface(bytes4): selector + 4-byte id left-padded to 32 bytes.
  const data = SUPPORTS_INTERFACE + ifaceId + "0".repeat(64 - 8);
  const res = await ethCall(rpcs, contract, data);
  return !!res && /0{63}1$/.test(res.slice(2)); // returns bool true (…0001)
}

// Determines the token standard at an address on a given chain, or null if the
// chain responded but no supported standard is present. Assumes bytecode exists.
export async function detectStandard(
  rpcs: string[],
  contract: string,
): Promise<Standard | null> {
  // ERC-165 first (definitive for NFTs).
  if (await supportsInterface(rpcs, contract, IFACE.erc721)) return "erc721";
  if (await supportsInterface(rpcs, contract, IFACE.erc1155)) return "erc1155";

  // ERC-20 has no ERC-165 — probe the two load-bearing views functionally.
  const totalSupply = await ethCall(rpcs, contract, SEL.totalSupply);
  const balanceOf = await ethCall(rpcs, contract, SEL.balanceOf + "0".repeat(64));
  const wellFormed = (h: string | null) => !!h && h !== "0x" && h.length >= 66;
  if (wellFormed(totalSupply) && wellFormed(balanceOf)) return "erc20";

  return null;
}
