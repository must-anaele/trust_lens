"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export function SiteHeader() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <header className="hdr">
      <div className="container hdr-in">
        <Link className="brand" href="/" aria-label="TRUST Lens home">
          <span className="logo" />
          TRUST Lens
        </Link>
        <nav aria-label={t("nav.label")}>
          <Link href="/#features" className="hide-sm">{t("nav.platform")}</Link>
          <Link href="/#how" className="hide-sm">{t("nav.method")}</Link>
          <Link href="/wallet-review" className="hide-sm">{t("nav.wallet")}</Link>
          <Link href="/#analyze" className="btn btn-ghost btn-sm">{t("nav.analyze")}</Link>
          <div className="language-toggle" role="group" aria-label={t("language.label")}>
            <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
            <span aria-hidden="true">|</span>
            <button type="button" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="footer">
      <div className="container row-f">
        <Link className="brand" style={{ fontSize: 14 }} href="/">
          <span className="logo" /> TRUST Lens
        </Link>
        <span>{t("footer")}</span>
      </div>
    </footer>
  );
}
