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
        <nav className="desktop-nav" aria-label={t("nav.label")}>
          <div className="nav-links">
            <Link href="/#features">{t("nav.platform")}</Link>
            <Link href="/#how">{t("nav.method")}</Link>
            <Link href="/wallet-review">{t("nav.wallet")}</Link>
            <Link href="/markets">Markets</Link>
          </div>
          <div className="nav-actions">
            <Link href="/account" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link href="/#analyze" className="btn btn-ghost btn-sm">{t("nav.analyze")}</Link>
            <LanguageToggle language={language} setLanguage={setLanguage} label={t("language.label")} />
          </div>
        </nav>
        <details className="mobile-nav">
          <summary aria-label={t("nav.label")}>{t("nav.menu")}</summary>
          <nav aria-label={t("nav.label")}>
            <Link href="/#features">{t("nav.platform")}</Link>
            <Link href="/#how">{t("nav.method")}</Link>
            <Link href="/wallet-review">{t("nav.wallet")}</Link>
            <Link href="/markets">Markets</Link>
            <Link href="/account">Sign in</Link>
            <Link href="/#analyze" className="mobile-nav-cta">{t("nav.analyze")}</Link>
            <LanguageToggle language={language} setLanguage={setLanguage} label={t("language.label")} />
          </nav>
        </details>
      </div>
    </header>
  );
}

function LanguageToggle({ language, setLanguage, label }: { language: "en" | "ko"; setLanguage: (language: "en" | "ko") => void; label: string }) {
  return (
    <div className="language-toggle" role="group" aria-label={label}>
      <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
      <span aria-hidden="true">|</span>
      <button type="button" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
    </div>
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
