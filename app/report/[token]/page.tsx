import type { Metadata } from "next";
import { PublicTrustReport } from "@/components/public-trust-report";

export const metadata: Metadata = {
  title: "Reviewed trust report | TRUST Lens",
  description: "A human-reviewed, evidence-based blockchain contract report.",
};

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicTrustReport token={token} />;
}
