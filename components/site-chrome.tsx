"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";

export function SiteHeader() {
  const { language, setLanguage, t } = useLanguage();
  const { user, loading } = useAuth();
  return (
    <header className="hdr">
      <div className="container hdr-in">
        <Link className="brand" href="/" aria-label="TRUST Lens home"><span className="logo" />TRUST Lens</Link>
        <nav className="desktop-nav" aria-label={t("nav.label")}>
          <div className="nav-links">
            <Link href="/#features">{t("nav.platform")}</Link>
            <Link href="/#how">{t("nav.method")}</Link>
            <Link href="/wallet-review">{t("nav.wallet")}</Link>
            <Link href="/markets">Markets</Link>
            <Link href="/#analyze" className="btn btn-ghost btn-sm">{t("nav.analyze")}</Link>
          </div>
          <div className="nav-actions">
            {loading ? <span className="nav-auth-loading">Account</span> : user ? <UserMenu /> : <Link href="/account" className="btn btn-ghost btn-sm">Sign in</Link>}
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
            <Link href="/#analyze" className="mobile-nav-cta">{t("nav.analyze")}</Link>
            {loading ? <span className="mobile-nav-loading">Checking account…</span> : user ? <UserMenu mobile /> : <Link href="/account">Sign in</Link>}
            <LanguageToggle language={language} setLanguage={setLanguage} label={t("language.label")} />
          </nav>
        </details>
      </div>
    </header>
  );
}

function UserMenu({ mobile = false }: { mobile?: boolean }) {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const initials = (user.name || user.email || "U").trim().split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
  return (
    <details className={`user-menu${mobile ? " user-menu-mobile" : ""}`}>
      <summary aria-label={`User menu for ${user.name || user.email || "your account"}`}>
        <span className="user-avatar" aria-hidden="true">{initials}</span>{mobile && <span>{user.name || user.email}</span>}
      </summary>
      <div className="user-menu-panel">
        <strong>{user.name || "Your account"}</strong>
        <span className="user-menu-email">{user.email}</span>
        <dl>
          <div><dt>Joined</dt><dd>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unavailable"}</dd></div>
          <div><dt>Last sign in</dt><dd>{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : "Unavailable"}</dd></div>
        </dl>
        <Link href="/account">Account page</Link>
        <button type="button" onClick={() => void signOut()}>Sign out</button>
      </div>
    </details>
  );
}

function LanguageToggle({ language, setLanguage, label }: { language: "en" | "ko"; setLanguage: (language: "en" | "ko") => void; label: string }) {
  return <div className="language-toggle" role="group" aria-label={label}>
    <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
    <span aria-hidden="true">|</span>
    <button type="button" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
  </div>;
}

export function SiteFooter() {
  const { t } = useLanguage();
  return <footer className="footer"><div className="container row-f">
    <Link className="brand" style={{ fontSize: 14 }} href="/"><span className="logo" /> TRUST Lens</Link>
    <span>{t("footer")}</span>
  </div></footer>;
}
