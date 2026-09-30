"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type User = { id: string; email?: string };

export function AccountPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {}); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed.");
      if (mode === "signup") { setMessage(data.message); setMode("login"); setPassword(""); }
      else { setUser(data.user); setMessage("You are signed in. Your watchlist will sync across devices."); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not sign in."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }); setUser(null); setMessage("You have signed out.");
  }

  return <section className="account-card">
    <p className="section-kicker">TRUST Lens account</p>
    {user ? <>
      <h1>Your watchlist syncs across devices.</h1>
      <p className="mut">Signed in as {user.email}</p>
      <div className="account-actions"><Link className="btn btn-primary" href="/markets">Open token markets</Link><button className="btn btn-ghost" onClick={logout}>Sign out</button></div>
    </> : <>
      <h1>{mode === "login" ? "Sign in to your account" : "Create your account"}</h1>
      <p className="mut">Save tokens and manage alerts from any device.</p>
      <form className="account-form" onSubmit={submit}>
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
