// Shared types for TrustLens.

// Token standards TrustLens can detect and analyze.
export type Standard = "erc20" | "erc721" | "erc1155";

// Display-only slice of a chain's config. This is what crosses into the browser
// via AnalyzeResult — the RPC endpoint list stays server-side (see lib/chains.ts).
export interface ChainInfo {
  id: number; // EVM chain id (e.g. 137 = Polygon)
  name: string; // "Polygon PoS"
  shortName: string; // "Polygon"
  explorer: string; // "https://polygonscan.com"
  nativeSymbol: string; // "POL" / "ETH" / "BNB"
}

export interface Facts {
  contract: string;
  chain: ChainInfo;
  standard: Standard;
  name: string | null;
  symbol: string | null;
  // ERC-20-specific (undefined/null for NFTs).
  decimals?: number | null;
  total_supply_raw?: string | null; // string, not bigint, so it JSON-serializes
  total_supply?: number | null; // integer part, for display / AI context
  // ERC-721 / ERC-1155 metadata probe (a sampled tokenURI/uri), when available.
  token_uri_sample?: string | null;
  owner: string;
  owner_kind: string;
  paused: boolean;
  is_proxy: boolean;
  proxy_implementation: string | null;
  proxy_admin: string | null;
  bytecode_bytes: number | null;
}

// Result of the deployed-bytecode privileged-function scan.
export interface Powers {
  bytecode_bytes: number | null;
  has_mint: boolean;
  has_burn: boolean;
  has_pause: boolean;
  has_fee_hint: boolean;
  has_blacklist: boolean;
  has_accesscontrol: boolean;
  has_metadata_mutable: boolean; // NFT: setBaseURI/setURI/setTokenURI present
  is_proxy: boolean;
  owner_renounced: boolean;
  pause_callable: boolean | null; // null = role-gated / indeterminate without source
  present: string[]; // human labels of detected privileged surfaces
}

export type ReconVerdict =
  | "not_supported"
  | "neutralized"
  | "display_only"
  | "unresolved"
  | "active";

export interface Reconciliation {
  claim: string;
  evidence: string;
  verdict: ReconVerdict;
}

export interface Assessment {
  status: "cleared" | "unresolved" | "risk";
  headline: string;
  reasons: string[];
  reconciliation: Reconciliation[];
  caveat: string;
}

export interface TransferEvent {
  type: "Transfer" | "TransferSingle" | "TransferBatch";
  kind: Standard;
  from: string;
  to: string;
  amount?: number; // fungible value (erc20) or unit count (erc1155)
  tokenId?: string; // string to survive JSON + very large ids (erc721/erc1155)
  block: number;
  tx: string | null;
}

export interface Verdict {
  severity: "critical" | "high" | "medium" | "info";
  emoji: string;
  headline: string;
  why_it_matters: string;
  recommended_action: string;
}

export interface AnalyzeResult {
  facts: Facts;
  powers: Powers;
  assessment: Assessment;
  events: TransferEvent[];
  report: string | null;
  alerts: Verdict[] | null;
  aiError: string | null;
  hasAiProvider: boolean;
  alsoFoundOn?: ChainInfo[]; // same address recognized on other chains
}
