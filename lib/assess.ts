// TrustLens · assess — deterministic trust assessment (NO AI, NO key).
// Reconciles what the powers scan found against what a buyer would care about,
// standard-aware (ERC-20 vs NFT), and rolls it up into an honest status.

import type { Facts, Powers, Assessment, Reconciliation } from "./types";

export function assess(facts: Facts, powers: Powers): Assessment {
  const recon: Reconciliation[] = [];
  const isNft = facts.standard !== "erc20";

  // 1. Mint
  if (isNft) {
    if (!powers.has_mint) {
      recon.push({ claim: "New NFTs can be minted", evidence: "No mint function found in the bytecode (fixed collection).", verdict: "not_supported" });
    } else if (powers.owner_renounced && !powers.has_accesscontrol) {
      recon.push({ claim: "New NFTs can be minted", evidence: "mint exists, but owner is renounced (0x0) and there are no roles — not callable.", verdict: "neutralized" });
    } else {
      recon.push({ claim: "New NFTs can be minted", evidence: "mint function present and an admin/role can call it — collection size can still grow.", verdict: "active" });
    }
  } else {
    if (!powers.has_mint) {
      recon.push({ claim: "Owner can mint new supply", evidence: "No mint function found in the bytecode (fixed supply).", verdict: "not_supported" });
    } else if (powers.owner_renounced && !powers.has_accesscontrol) {
      recon.push({ claim: "Owner can mint new supply", evidence: "mint exists, but owner is renounced (0x0) and there are no roles — not callable.", verdict: "neutralized" });
    } else {
      recon.push({ claim: "Owner can mint new supply", evidence: "mint function present and an admin/role can call it.", verdict: "active" });
    }
  }

  // 2. Fees (ERC-20) / metadata mutability (NFT)
  if (isNft) {
    if (!powers.has_metadata_mutable) {
      recon.push({ claim: "NFT metadata can be changed after mint", evidence: "No setBaseURI / setTokenURI / setURI selector found — metadata is effectively frozen.", verdict: "not_supported" });
    } else {
      recon.push({ claim: "NFT metadata can be changed after mint", evidence: "A metadata-mutation function is present — confirm who can call it in the verified source.", verdict: "unresolved" });
    }
  } else {
    if (!powers.has_fee_hint) {
      recon.push({ claim: "Owner can change fees", evidence: "No known fee-function selectors found in the bytecode.", verdict: "not_supported" });
    } else {
      recon.push({ claim: "Owner can change fees", evidence: "A possible fee function is present — confirm against verified source.", verdict: "unresolved" });
    }
  }

  // 3. Pause / disable transfers
  if (!powers.has_pause) {
    recon.push({ claim: "Owner can pause transfers", evidence: "No pause function found.", verdict: "not_supported" });
  } else if (powers.pause_callable === false) {
    recon.push({ claim: "Owner can pause transfers", evidence: "pause() exists but owner is renounced — permanently un-callable.", verdict: "neutralized" });
  } else if (powers.pause_callable === true) {
    recon.push({ claim: "Owner can pause transfers", evidence: "pause() exists and the owner can call it.", verdict: "active" });
  } else {
    recon.push({ claim: "Owner can pause transfers", evidence: "pause() exists and is role-gated — confirm role holders in source.", verdict: "unresolved" });
  }

  // 4. Upgradeability
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
  if (!powers.has_mint) reasons.push(isNft ? "No mint capability in the bytecode — collection is fixed." : "No mint capability in the bytecode — supply is fixed.");
  if (powers.has_pause && powers.pause_callable === false) reasons.push("pause() is bricked by ownership renouncement.");
  if (!powers.is_proxy) reasons.push("Non-upgradeable — the code cannot be swapped later.");
  if (!powers.has_accesscontrol) reasons.push("No role-based admin (AccessControl) present.");
  if (isNft && !powers.has_metadata_mutable) reasons.push("Metadata functions not found — NFT images/attributes are effectively frozen.");

  return {
    status,
    headline,
    reasons,
    reconciliation: recon,
    caveat:
      "Bytecode selector-scan is a strong heuristic, confirmed by the verified Solidity source. Fee and metadata detection cover known selectors only.",
  };
}
