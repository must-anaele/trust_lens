"use client";

import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { useLanguage } from "@/components/language-provider";
import { WalletReviewTool } from "@/components/wallet-review-tool";

export function WalletReviewPageContent() {
  const { t } = useLanguage();
  return <>
    <SiteHeader />
    <main className="wallet-page">
      <section className="wallet-page-hero">
        <div className="container">
          <Link className="back-link" href="/">{t("wallet.back")}</Link>
          <div className="wallet-hero-grid">
            <div><div className="eyebrow">{t("wallet.eyebrow")}</div>
              <h1>{t("wallet.hero")} <span className="grad">{t("wallet.heroAccent")}</span></h1>
              <p>{t("wallet.heroText")}</p>
            </div>
            <div className="wallet-hero-art" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="wallet-core">⌁</div><span className="orbit-node node-one">ERC-20</span><span className="orbit-node node-two">NFT</span><span className="orbit-node node-three">{t("wallet.readonly")}</span>
            </div>
          </div>
          <div className="wallet-proof-strip"><span><i /> {t("wallet.noConnect")}</span><span><i /> {t("wallet.noSign")}</span><span><i /> {t("wallet.chainEvidence")}</span></div>
        </div>
      </section>
      <section className="section wallet-tool-section"><div className="container"><WalletReviewTool /></div></section>
    </main>
    <SiteFooter />
  </>;
}
