import { ethCall, rpc, type ChainConfig } from "./chains";

const APPROVAL = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const APPROVAL_FOR_ALL = "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31";
const HISTORY_BLOCKS = 50_000;
const CHUNK_SIZE = 5_000;
const MAX_LOGS = 500;

export interface WalletApproval {
  kind: "token allowance" | "NFT token approval" | "NFT operator approval";
  contract: string;
  spender: string;
  amount: string | null;
  tokenId: string | null;
  active: boolean | null;
  evidence: string;
}

export interface WalletReview {
  chain: { name: string; explorer: string; nativeSymbol: string };
  address: string;
  nativeBalance: string;
  accountNonce: string;
  hasCode: boolean;
  checkedAt: string;
  blocksScanned: number;
  approvals: WalletApproval[];
  caveat: string;
}

function topicAddress(address: string) {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function readAddress(topic: string) {
  return `0x${topic.slice(-40)}`;
}

function asBigInt(hex: string | null) {
  if (!hex || !/^0x[0-9a-f]+$/i.test(hex)) return null;
  try { return BigInt(hex); } catch { return null; }
}

function displayAmount(amount: bigint) {
  return amount >= (1n << 255n) ? "Unlimited / max uint256" : amount.toString();
}

function formatNativeBalance(raw: string) {
  const value = BigInt(raw);
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").slice(0, 8).replace(/0+$/, "");
  if (whole === 0n && value > 0n && !fraction) return "<0.00000001";
  return fraction ? `${whole.toLocaleString()}.${fraction}` : whole.toLocaleString();
}

async function getLogs(config: ChainConfig, filter: Record<string, unknown>) {
  const head = Number(BigInt(await rpc(config.rpcs, "eth_blockNumber", [])));
  const from = Math.max(0, head - HISTORY_BLOCKS + 1);
  const logs: any[] = [];
  for (let start = from; start <= head; start += CHUNK_SIZE) {
    const end = Math.min(head, start + CHUNK_SIZE - 1);
    const chunk = await rpc(config.rpcs, "eth_getLogs", [{
      ...filter,
      fromBlock: `0x${start.toString(16)}`,
      toBlock: `0x${end.toString(16)}`,
    }]);
    if (Array.isArray(chunk)) logs.push(...chunk);
    if (logs.length > MAX_LOGS) {
      throw new Error("Too many approval events in this scan window. Narrow the review to a smaller period or try again later.");
    }
  }
  return { head, from, logs };
}

export async function reviewWallet(config: ChainConfig, address: string): Promise<WalletReview> {
  const ownerTopic = topicAddress(address);
  const [allowanceLogs, operatorLogs, nativeBalance, accountNonce, code] = await Promise.all([
    getLogs(config, { topics: [APPROVAL, ownerTopic] }),
    getLogs(config, { topics: [APPROVAL_FOR_ALL, ownerTopic] }),
    rpc(config.rpcs, "eth_getBalance", [address, "latest"]),
    rpc(config.rpcs, "eth_getTransactionCount", [address, "latest"]),
    rpc(config.rpcs, "eth_getCode", [address, "latest"]),
  ]);
  const approvals: WalletApproval[] = [];

  const latestAllowanceLog = new Map<string, any>();
  for (const log of allowanceLogs.logs) {
    if (log.topics?.length < 3) continue;
    const spender = readAddress(log.topics[2]);
    const tokenIdTopic = log.topics[3] ? `:${log.topics[3]}` : "";
    const key = `${log.address.toLowerCase()}:${spender.toLowerCase()}${tokenIdTopic}`;
    const prior = latestAllowanceLog.get(key);
    if (!prior || BigInt(log.blockNumber) > BigInt(prior.blockNumber)) latestAllowanceLog.set(key, log);
  }

  for (const log of latestAllowanceLog.values()) {
    const contract = String(log.address).toLowerCase();
    const spender = readAddress(log.topics[2]);
    const result = await ethCall(config.rpcs, contract,
      `0xdd62ed3e${ownerTopic.slice(2)}${topicAddress(spender).slice(2)}`);
    const allowance = asBigInt(result);
    if (allowance !== null) {
      approvals.push({
        kind: "token allowance", contract, spender, amount: displayAmount(allowance),
        tokenId: null, active: allowance > 0n,
        evidence: "Current ERC-20 allowance() value read from the selected chain.",
      });
      continue;
    }

    // ERC-721 indexes tokenId as topic[3]; ERC-20 stores allowance in data.
    const tokenId = asBigInt(log.topics[3] ?? null);
    if (tokenId === null) continue;
    const approved = await ethCall(config.rpcs, contract,
      `0x081812fc${tokenId.toString(16).padStart(64, "0")}`);
    const approvedAddress = approved && approved.length >= 42 ? `0x${approved.slice(-40)}`.toLowerCase() : null;
    approvals.push({
      kind: "NFT token approval", contract, spender, amount: null,
      tokenId: tokenId.toString(),
      active: approvedAddress === spender.toLowerCase(),
      evidence: approvedAddress === null
        ? "An Approval event was found, but current token approval could not be confirmed."
        : "Current getApproved(tokenId) value compared with the event spender.",
    });
  }

  const latestOperatorLog = new Map<string, any>();
  for (const log of operatorLogs.logs) {
    if (log.topics?.length < 3) continue;
    const operator = readAddress(log.topics[2]);
    const key = `${String(log.address).toLowerCase()}:${operator.toLowerCase()}`;
    const prior = latestOperatorLog.get(key);
    if (!prior || BigInt(log.blockNumber) > BigInt(prior.blockNumber)) latestOperatorLog.set(key, log);
  }
  for (const log of latestOperatorLog.values()) {
    const contract = String(log.address).toLowerCase();
    const operator = readAddress(log.topics[2]);
    const current = await ethCall(config.rpcs, contract,
      `0xe985e9c5${ownerTopic.slice(2)}${topicAddress(operator).slice(2)}`);
    const approved = current === "0x" ? null : asBigInt(current);
    approvals.push({
      kind: "NFT operator approval", contract, spender: operator, amount: null,
      tokenId: null, active: approved === null ? null : approved !== 0n,
      evidence: approved === null
        ? "An ApprovalForAll event was found, but current operator approval could not be confirmed."
        : "Current isApprovedForAll(owner, operator) value read from the selected chain.",
    });
  }

  approvals.sort((a, b) => Number(b.active === true) - Number(a.active === true));
  const blocksScanned = Math.min(allowanceLogs.head, operatorLogs.head) -
    Math.max(allowanceLogs.from, operatorLogs.from) + 1;
  return {
    chain: { name: config.name, explorer: config.explorer, nativeSymbol: config.nativeSymbol },
    address,
    nativeBalance: formatNativeBalance(nativeBalance),
    accountNonce: BigInt(accountNonce).toString(),
    hasCode: Boolean(code && code !== "0x"),
    checkedAt: new Date().toISOString(), blocksScanned,
    approvals,
    caveat: `Scanned the most recent ${blocksScanned.toLocaleString()} blocks only. This is an approval review, not a full wallet audit; old events, non-standard contracts, and unrecognized approval patterns may be missed.`,
  };
}
