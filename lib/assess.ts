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
      recon.push(powers.bytecode_scan_complete
        ? { claim: "New NFTs can be minted", evidence: "No mint function selector found in the scanned bytecode.", verdict: "not_supported" }
        : { claim: "New NFTs can be minted", evidence: "Bytecode scan was incomplete; mint capability is unresolved.", verdict: "unresolved" });
    } else if (powers.owner_renounced && !powers.has_accesscontrol) {
      recon.push({ claim: "New NFTs can be minted", evidence: "mint exists, but owner is renounced (0x0) and there are no roles — not callable.", verdict: "neutralized" });
    } else {
      recon.push({ claim: "New NFTs can be minted", evidence: "mint function present and an admin/role can call it — collection size can still grow.", verdict: "active" });
    }
  } else {
    if (!powers.has_mint) {
      recon.push(powers.bytecode_scan_complete
        ? { claim: "Owner can mint new supply", evidence: "No mint function selector found in the scanned bytecode.", verdict: "not_supported" }
        : { claim: "Owner can mint new supply", evidence: "Bytecode scan was incomplete; mint capability is unresolved.", verdict: "unresolved" });
    } else if (powers.owner_renounced && !powers.has_accesscontrol) {
      recon.push({ claim: "Owner can mint new supply", evidence: "mint exists, but owner is renounced (0x0) and there are no roles — not callable.", verdict: "neutralized" });
    } else {
      recon.push({ claim: "Owner can mint new supply", evidence: "mint function present and an admin/role can call it.", verdict: "active" });
    }
  }

  // 2. Fees (ERC-20) / metadata mutability (NFT)
  if (isNft) {
    if (!powers.has_metadata_mutable) {
      recon.push(powers.bytecode_scan_complete
        ? { claim: "NFT metadata can be changed after mint", evidence: "No known metadata-mutation selector was found in the scanned bytecode.", verdict: "not_supported" }
        : { claim: "NFT metadata can be changed after mint", evidence: "Bytecode scan was incomplete; metadata mutability is unresolved.", verdict: "unresolved" });
    } else {
      recon.push({ claim: "NFT metadata can be changed after mint", evidence: "A metadata-mutation function is present — confirm who can call it in the verified source.", verdict: "unresolved" });
    }
  } else {
    if (!powers.has_fee_hint) {
      recon.push(powers.bytecode_scan_complete
        ? { claim: "Owner can change fees", evidence: "No known fee-function selector was found in the scanned bytecode.", verdict: "not_supported" }
        : { claim: "Owner can change fees", evidence: "Bytecode scan was incomplete; fee controls are unresolved.", verdict: "unresolved" });
    } else {
      recon.push({ claim: "Owner can change fees", evidence: "A possible fee function is present — confirm against verified source.", verdict: "unresolved" });
    }
  }

  // 3. Pause / disable transfers
  if (!powers.has_pause) {
    recon.push(powers.bytecode_scan_complete
      ? { claim: "Owner can pause transfers", evidence: "No pause function selector was found in the scanned bytecode.", verdict: "not_supported" }
      : { claim: "Owner can pause transfers", evidence: "Bytecode scan was incomplete; pause capability is unresolved.", verdict: "unresolved" });
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
  if (!powers.has_mint && powers.bytecode_scan_complete) reasons.push("No known mint selector found in the scanned bytecode.");
  if (powers.has_pause && powers.pause_callable === false) reasons.push("pause() is bricked by ownership renouncement.");
  if (!powers.is_proxy) reasons.push("No EIP-1967 implementation slot detected; other proxy patterns may not be recognized.");
  if (!powers.has_accesscontrol && powers.bytecode_scan_complete) reasons.push("No known AccessControl selector found in the scanned bytecode.");
  if (isNft && !powers.has_metadata_mutable && powers.bytecode_scan_complete) reasons.push("No known metadata-mutation selector found in the scanned bytecode.");
  if (!powers.bytecode_scan_complete) reasons.push("Privileged-function scan is incomplete; treat negative selector results as unresolved.");

  return {
    status,
    headline,
    reasons,
    reconciliation: recon,
    caveat:
      "Bytecode selector scanning is a heuristic and does not prove that functions are absent or callable. Only known selectors are checked; role permissions and source behavior require separate verification. Proxy implementation bytecode must be available for a complete proxy scan.",
  };
}
