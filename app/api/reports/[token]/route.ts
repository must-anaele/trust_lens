import { NextResponse } from "next/server";
import { getPublishedReview } from "@/lib/review-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  try {
    const review = await getPublishedReview(token);
    if (!review) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const { facts, powers, assessment, events, report, alerts, alsoFoundOn } = review.result;
    return NextResponse.json({
      assetSlug: review.asset_slug,
      checkedAt: review.checked_at,
      reviewedAt: review.reviewed_at,
      address: review.address,
      chainId: review.chain_id,
      facts, powers, assessment, events, report, alerts, alsoFoundOn,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Report storage is unavailable." }, { status: 503 });
  }
}
