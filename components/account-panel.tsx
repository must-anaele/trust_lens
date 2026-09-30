"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function AccountPanel() {
  const { user, loading, refresh, signOut } = useAuth();
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

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, firstName, lastName, phone, address, country }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed.");
      if (mode === "signup") { setMessage(data.message); setMode("login"); setPassword(""); }
      else {
        await refresh();
        setMessage("You are signed in. Your watchlist will sync across devices.");
        const next = new URLSearchParams(window.location.search).get("next");
        if (next?.startsWith("/") && !next.startsWith("//")) window.location.replace(next);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not sign in."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await signOut();
    setMessage("You have signed out.");
  }

  return <section className="account-card">
    <p className="section-kicker">TRUST Lens account</p>
    {loading ? <><h1>Checking your account…</h1><p className="mut">Loading your profile.</p></> : user ? <>
      <h1>Welcome, {user.name || "User"}.</h1>
      <div className="account-profile-details">
        <div><span>First name</span><strong>{user.firstName || "Not provided"}</strong></div>
        <div><span>Last name</span><strong>{user.lastName || "Not provided"}</strong></div>
        <div><span>Email</span><strong>{user.email || "Unavailable"}</strong></div>
        <div><span>Phone</span><strong>{user.phone || "Not provided"}</strong></div>
        <div><span>Address</span><strong>{user.address || "Not provided"}</strong></div>
        <div><span>Country</span><strong>{user.country || "Not provided"}</strong></div>
        <div><span>Signed up</span><strong>{user.createdAt ? new Date(user.createdAt).toLocaleString() : "Unavailable"}</strong></div>
        <div><span>Last logged in</span><strong>{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : "Unavailable"}</strong></div>
      </div>
      <div className="account-actions"><Link className="btn btn-primary" href="/markets">Open token markets</Link><button className="btn btn-ghost" onClick={logout}>Sign out</button></div>
    </> : <>
      <h1>{mode === "login" ? "Sign in to your account" : "Create your account"}</h1>
      <p className="mut">Save tokens and manage alerts from any device.</p>
      <form className="account-form" onSubmit={submit}>
        {mode === "signup" && <>
          <div className="signup-name-fields">
            <label>First name<input className="input" type="text" autoComplete="given-name" required maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
            <label>Last name<input className="input" type="text" autoComplete="family-name" required maxLength={80} value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
          </div>
          <label>Phone<input className="input" type="tel" autoComplete="tel" required maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label>Address<input className="input" type="text" autoComplete="street-address" required maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} /></label>
          <label>Country<input className="input" type="text" autoComplete="country-name" required maxLength={100} value={country} onChange={(e) => setCountry(e.target.value)} /></label>
        </>}
        <label>Email<input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input className="input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      {error && <p className="err" role="alert">{error}</p>}
      {message && <p className="account-message" role="status">{message}</p>}
      <button className="linkbtn" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
        {mode === "login" ? "New to TRUST Lens? Create an account" : "Already have an account? Sign in"}
      </button>
    </>}
    <p className="account-foot">Email confirmation and password rules are managed by the connected Supabase project.</p>
  </section>;
}
