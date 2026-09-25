"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function signIn(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      window.location.assign("/admin");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }
  return <main className="admin-auth-page">
    <Link className="brand" href="/"><span className="logo" /> TRUST Lens</Link>
    <section className="admin-panel">
      <div className="card-overline">Staff access</div>
      <h1>Security review console</h1>
      <p>Sign in to review project contracts, save evidence, and manage publication.</p>
      <form onSubmit={signIn} className="admin-form">
        <label>Password<input className="input" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      </form>
    </section>
  </main>;
}
