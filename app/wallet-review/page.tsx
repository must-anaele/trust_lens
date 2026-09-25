import type { Metadata } from "next";
import { WalletReviewPageContent } from "@/components/wallet-review-page-content";

export const metadata: Metadata = {
  title: "Wallet analysis | TRUST Lens",
  description: "Review a wallet's public account details and supported token and NFT permissions.",
};

export default function WalletReviewPage() {
  return <WalletReviewPageContent />;
}
