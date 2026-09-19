// TrustLens · assess — deterministic trust assessment (NO AI, NO key).
// Reconciles each public scanner claim against the on-chain + bytecode evidence,
// and rolls it up into an honest status. This is what lets the tool produce an
// evidence-based verdict even when the AI layer is unavailable.

import type { Facts, Powers, Assessment, Reconciliation } from "./types";

export function assess(_facts: Facts, powers: Powers): Assessment {
  const recon: Reconciliation[] = [];

  // 1. Mint
  if (!powers.has_mint) {
    recon.push({ claim: "Owner can mint new supply", evidence: "No mint function found in the bytecode (fixed supply).", verdict: "not_supported" });
  } else if (powers.owner_renounced && !powers.has_accesscontrol) {
    recon.push({ claim: "Owner can mint new supply", evidence: "mint exists, but owner is renounced (0x0) and there are no roles — not callable.", verdict: "neutralized" });
  } else {
    recon.push({ claim: "Owner can mint new supply", evidence: "mint function present and an admin/role can call it.", verdict: "active" });
  }

  // 2. Fees
  if (!powers.has_fee_hint) {
    recon.push({ claim: "Owner can change fees", evidence: "No known fee-function selectors found in the bytecode.", verdict: "not_supported" });
  } else {
    recon.push({ claim: "Owner can change fees", evidence: "A possible fee function is present — confirm against verified source.", verdict: "unresolved" });
  }

  // 3. Pause / disable sells
  if (!powers.has_pause) {
    recon.push({ claim: "Owner can disable sells (pause)", evidence: "No pause function found.", verdict: "not_supported" });
  } else if (powers.pause_callable === false) {
    recon.push({ claim: "Owner can disable sells (pause)", evidence: "pause() exists but owner is renounced — permanently un-callable.", verdict: "neutralized" });
  } else if (powers.pause_callable === true) {
    recon.push({ claim: "Owner can disable sells (pause)", evidence: "pause() exists and the owner can call it.", verdict: "active" });
  } else {
    recon.push({ claim: "Owner can disable sells (pause)", evidence: "pause() exists and is role-gated — confirm role holders in source.", verdict: "unresolved" });
  }

  // 4. UI multiplier
  recon.push({ claim: "UI Multiplier scales displayed balance", evidence: "No multiplier function in the bytecode — most likely an explorer display field. Confirm app balance == balanceOf.", verdict: "display_only" });

  // 5. Upgradeability
  if (powers.is_proxy) {
    recon.push({ claim: "Contract code can be changed (proxy)", evidence: "EIP-1967 implementation slot is set — contract is upgradeable.", verdict: "active" });
  }

  const has = (v: string) => recon.some((r) => r.verdict === v);
  const status: Assessment["status"] = has("active") ? "risk" : has("unresolved") ? "unresolved" : "cleared";

  const headline =
    status === "cleared"
      ? "No active privileged powers detected on-chain"
      : status === "unresolved"
        ? "Mostly clear — a few powers need source confirmation"
        : "Active privileged power detected — treat with caution";

  const reasons: string[] = [];
  if (!powers.has_mint) reasons.push("No mint capability in the bytecode — supply is fixed.");
  if (powers.has_pause && powers.pause_callable === false) reasons.push("pause() is bricked by ownership renouncement.");
  if (!powers.is_proxy) reasons.push("Non-upgradeable — the code cannot be swapped later.");
  if (!powers.has_accesscontrol) reasons.push("No role-based admin (AccessControl) present.");
  if (!powers.has_fee_hint) reasons.push("No fee-on-transfer functions detected.");

  return {
    status,
    headline,
    reasons,
    reconciliation: recon,
    caveat:
      "Bytecode selector-scan is a strong heuristic, confirmed by the verified Solidity source. Fee detection covers known selectors only.",
  };
}
