import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { updateReview, type ReviewStatus } from "@/lib/review-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!await hasAdminSession()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  } catch { return NextResponse.json({ error: "Admin login is not configured." }, { status: 503 }); }
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid review ID." }, { status: 400 });
  let body: { status?: unknown; note?: unknown; published?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const status = body.status;
  if (status !== "pending" && status !== "approved" && status !== "needs_action") {
    return NextResponse.json({ error: "Select a valid review status." }, { status: 400 });
  }
  const published = body.published === true;
  if (published && status !== "approved") return NextResponse.json({ error: "Only approved reviews can be published." }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > 2_000) return NextResponse.json({ error: "Review notes must be 2,000 characters or fewer." }, { status: 400 });
  try {
    const review = await updateReview(id, {
      status: status as ReviewStatus,
      review_note: note || null,
      reviewed_at: status === "pending" ? null : new Date().toISOString(),
      published,
      share_token: published ? randomUUID() : null,
    });
    if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
    return NextResponse.json({ review });
  } catch {
    return NextResponse.json({ error: "Could not update the review." }, { status: 503 });
  }
}
