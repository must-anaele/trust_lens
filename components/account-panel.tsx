"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";

export function AccountPanel() {
  const { user, loading, refresh, signOut } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, firstName, lastName, phone, address, country }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed.");
      if (mode === "signup") { setMessage(t("account.signupMessage")); setMode("login"); setPassword(""); }
      else {
        await refresh();
        setMessage(t("account.signedIn"));
        const next = new URLSearchParams(window.location.search).get("next");
        if (next?.startsWith("/") && !next.startsWith("//")) window.location.replace(next);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not sign in."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await signOut();
    setMessage(t("account.signedOut"));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, address, country }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update your profile.");
      await refresh();
      setEditing(false);
      setMessage(t("account.profileSaved"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("account.profileSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return <section className="account-card">
    <p className="section-kicker">{t("account.kicker")}</p>
    {loading ? <><h1>{t("account.loading")}</h1><p className="mut">{t("account.loadingProfile")}</p></> : user ? <>
      <h1>{t("account.welcome")} {user.name || t("account.user")}.</h1>
      {editing ? <form className="account-form" onSubmit={saveProfile}>
        <label>{t("account.firstName")}<input className="input" type="text" autoComplete="given-name" required maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
        <label>{t("account.lastName")}<input className="input" type="text" autoComplete="family-name" required maxLength={80} value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
        <label>{t("account.email")}<input className="input" type="email" value={user.email || ""} disabled /></label>
        <label>{t("account.phone")}<input className="input" type="tel" autoComplete="tel" required maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <label>{t("account.address")}<input className="input" type="text" autoComplete="street-address" maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} /></label>
        <label>{t("account.country")}<input className="input" type="text" autoComplete="country-name" required maxLength={100} value={country} onChange={(e) => setCountry(e.target.value)} /></label>
        <div className="account-actions"><button className="btn btn-primary" disabled={busy}>{busy ? t("account.wait") : t("account.save")}</button><button className="btn btn-ghost" type="button" disabled={busy} onClick={() => { setEditing(false); setError(""); }}>{t("account.cancel")}</button></div>
      </form> : <div className="account-profile-details">
        <div><span>{t("account.firstName")}</span><strong>{user.firstName || t("account.notProvided")}</strong></div>
        <div><span>{t("account.lastName")}</span><strong>{user.lastName || t("account.notProvided")}</strong></div>
        <div><span>{t("account.email")}</span><strong>{user.email || t("account.unavailable")}</strong></div>
        <div><span>{t("account.phone")}</span><strong>{user.phone || t("account.notProvided")}</strong></div>
        <div><span>{t("account.address")}</span><strong>{user.address || t("account.notProvided")}</strong></div>
        <div><span>{t("account.country")}</span><strong>{user.country || t("account.notProvided")}</strong></div>
        <div><span>{t("account.signedUp")}</span><strong>{user.createdAt ? new Date(user.createdAt).toLocaleString() : t("account.unavailable")}</strong></div>
        <div><span>{t("account.lastLoggedIn")}</span><strong>{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : t("account.unavailable")}</strong></div>
      </div>}
      {error && <p className="err" role="alert">{error}</p>}
      {message && <p className="account-message" role="status">{message}</p>}
      {!editing && <div className="account-actions"><button className="btn btn-ghost" onClick={() => {
        setFirstName(user.firstName || ""); setLastName(user.lastName || ""); setPhone(user.phone || ""); setAddress(user.address || ""); setCountry(user.country || ""); setEditing(true); setError(""); setMessage("");
      }}>{t("account.editProfile")}</button><Link className="btn btn-primary" href="/markets">{t("account.markets")}</Link><button className="btn btn-ghost" onClick={logout}>{t("account.signout")}</button></div>}
    </> : <>
      <h1>{mode === "login" ? t("account.signinTitle") : t("account.signupTitle")}</h1>
      <p className="mut">{t("account.subtitle")}</p>
      <form className="account-form" onSubmit={submit}>
        {mode === "signup" && <>
          <div className="signup-name-fields">
            <label>{t("account.firstName")}<input className="input" type="text" autoComplete="given-name" required maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
            <label>{t("account.lastName")}<input className="input" type="text" autoComplete="family-name" required maxLength={80} value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
          </div>
          <label>{t("account.phone")}<input className="input" type="tel" autoComplete="tel" required maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label>{t("account.address")}<input className="input" type="text" autoComplete="street-address" required maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} /></label>
          <label>{t("account.country")}<input className="input" type="text" autoComplete="country-name" required maxLength={100} value={country} onChange={(e) => setCountry(e.target.value)} /></label>
        </>}
        <label>{t("account.email")}<input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>{t("account.password")}<input className="input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn btn-primary" disabled={busy}>{busy ? t("account.wait") : mode === "login" ? t("account.signin") : t("account.create")}</button>
      </form>
      {error && <p className="err" role="alert">{error}</p>}
      {message && <p className="account-message" role="status">{message}</p>}
      <button className="linkbtn" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
        {mode === "login" ? t("account.new") : t("account.existing")}
      </button>
    </>}
    <p className="account-foot">{t("account.foot")}</p>
  </section>;
}
