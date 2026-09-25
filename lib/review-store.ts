import type { AnalyzeResult } from "@/lib/types";

export type ReviewStatus = "pending" | "approved" | "needs_action";

export interface ReviewRecord {
  id: string;
  asset_slug: "sut" | "msq";
  address: string;
  chain_id: number;
  result: AnalyzeResult;
  status: ReviewStatus;
  review_note: string | null;
  published: boolean;
  share_token: string | null;
  checked_at: string;
  reviewed_at: string | null;
}

export interface MonitorSnapshot {
  id?: string;
  review_id: string;
  address: string;
  chain_id: number;
  snapshot: Record<string, unknown>;
  checked_at?: string;
}

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Review storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return { url, key };
}

async function rest<T>(table: string, query: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  if (!response.ok) {
    // Never return upstream response bodies: they can expose database details.
    throw new Error(`Review storage request failed (${response.status}).`);
  }
  if (!body) return undefined as T;
  try { return JSON.parse(body) as T; }
  catch { throw new Error("Review storage returned an invalid response."); }
}

export async function listReviews(): Promise<ReviewRecord[]> {
  return rest("trustlens_reviews", "?select=id,asset_slug,address,chain_id,result,status,review_note,published,share_token,checked_at,reviewed_at&order=checked_at.desc&limit=100");
}

export async function insertReview(input: Pick<ReviewRecord, "asset_slug" | "address" | "chain_id" | "result">): Promise<ReviewRecord> {
  const rows = await rest<ReviewRecord[]>("trustlens_reviews", "", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...input, status: "pending", published: false }),
  });
  if (!rows?.[0]) throw new Error("Review storage did not return the saved review.");
  return rows[0];
}

export async function updateReview(id: string, patch: Partial<Pick<ReviewRecord, "status" | "review_note" | "published" | "share_token" | "reviewed_at">>): Promise<ReviewRecord | null> {
  const rows = await rest<ReviewRecord[]>("trustlens_reviews", `?id=eq.${encodeURIComponent(id)}&select=id,asset_slug,address,chain_id,result,status,review_note,published,share_token,checked_at,reviewed_at`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch),
  });
  return rows?.[0] ?? null;
}

export async function getPublishedReview(token: string): Promise<ReviewRecord | null> {
  const rows = await rest<ReviewRecord[]>("trustlens_reviews", `?share_token=eq.${encodeURIComponent(token)}&published=eq.true&status=eq.approved&select=id,asset_slug,address,chain_id,result,status,published,checked_at,reviewed_at&limit=1`);
  return rows?.[0] ?? null;
}

export async function listApprovedReviews(): Promise<ReviewRecord[]> {
  return rest("trustlens_reviews", "?status=eq.approved&select=id,asset_slug,address,chain_id,result,checked_at&order=checked_at.desc&limit=100");
}

export async function getMonitorSnapshot(reviewId: string): Promise<MonitorSnapshot | null> {
  const rows = await rest<MonitorSnapshot[]>("trustlens_monitor_snapshots", `?review_id=eq.${encodeURIComponent(reviewId)}&select=review_id,address,chain_id,snapshot,checked_at&limit=1`);
  return rows?.[0] ?? null;
}

export async function listMonitorSnapshots(): Promise<MonitorSnapshot[]> {
  return rest("trustlens_monitor_snapshots", "?select=review_id,address,chain_id,snapshot,checked_at&limit=500");
}

export async function saveMonitorSnapshot(snapshot: MonitorSnapshot): Promise<void> {
  await rest("trustlens_monitor_snapshots", "?on_conflict=review_id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(snapshot),
  });
}

export async function insertMonitorEvent(event: {
  review_id: string; asset_slug: string; address: string; chain_id: number;
  change_type: string; before_value: unknown; after_value: unknown;
}): Promise<void> {
  await rest("trustlens_monitor_events", "", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(event) });
}

export async function listMonitorEvents(): Promise<Array<Record<string, unknown>>> {
  return rest("trustlens_monitor_events", "?select=id,review_id,asset_slug,address,chain_id,change_type,before_value,after_value,created_at&order=created_at.desc&limit=100");
}
