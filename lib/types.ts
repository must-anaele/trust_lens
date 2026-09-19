// Shared types for TrustLens.

export interface Facts {
  contract: string;
  chain: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  total_supply_raw: string | null; // string, not bigint, so it JSON-serializes
  total_supply: number | null; // integer part, for display / AI context
  owner: string;
  owner_kind: string;
  paused: boolean;
  is_proxy: boolean;
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
  type: "Transfer";
  from: string;
  to: string;
  amount: number;
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
  hasKey: boolean;
}
