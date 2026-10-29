"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";

export function AcceptInviteForm({ token, name, email, role }: { token: string; name: string; email: string; role: "ADMIN" | "AUTHOR" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const password = new FormData(event.currentTarget).get("password");
    try {
      const response = await fetch("/api/auth/accept-invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t activate your account.");
      router.replace(result.user.role === "ADMIN" ? "/admin/queue" : "/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t activate your account.");
      setBusy(false);
    }
  }

  return <div className="invite-accept-card"><span className="invite-accept-icon"><ShieldCheck size={21} /></span><div className="eyebrow">BOOKLEAF PORTAL</div><h1>Set up your account</h1><p className="invite-accept-intro">You’ve been invited to BookLeaf as a {role === "ADMIN" ? "team member" : "author"}.</p><div className="invite-identity"><strong>{name}</strong><span>{email}</span></div><form onSubmit={submit}><label className="field"><span>Create a password</span><span className="password-field"><KeyRound size={15} /><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} placeholder="At least 12 characters" required /></span></label><p className="password-hint">Use at least 12 characters. Keep it unique to BookLeaf.</p>{error && <div className="error" role="alert">{error}</div>}<button className="btn wide" disabled={busy}>{busy ? "Activating account…" : <>Accept invitation<ArrowRight size={15} /></>}</button></form></div>;
}
