"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign in failed.");
      router.replace(result.user.role === "ADMIN" ? "/admin/queue" : "/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <section className="login-art">
        <div className="brand"><Image className="brand-image" src="/brand/bookleaf-logo.jpg" alt="BookLeaf Publishing" width={180} height={81} priority /></div>
        <div><div className="leaf" /><h1>Every story<br />deserves care.</h1><p>Publishing support that keeps your story moving — from your first draft to the readers who find it.</p></div>
        <div className="art-quote">Thoughtfully published. Personally supported.</div>
        <div className="book-still"><div className="mini">BookLeaf Editions</div><strong>Whispers<br />of the<br />Ganges</strong><span>A STORY BY PRIYA SHARMA</span></div>
      </section>
      <section className="login-side">
        <form className="login-card" onSubmit={submit}>
          <div className="eyebrow">AUTHOR &amp; OPERATIONS PORTAL</div><h2>Welcome back</h2><p>Sign in to continue to your BookLeaf workspace.</p>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required /></div>
          <div className="error" role="alert">{error}</div><button className="btn wide" type="submit" disabled={busy}>{busy ? "Signing in…" : <>Sign in <span aria-hidden="true">→</span></>}</button>
          <div className="demo-hint"><b>Demo access</b><br />Author: priya.sharma@email.com · bookleaf123<br />Admin: admin@bookleaf.com · admin123</div>
        </form>
      </section>
    </div>
  );
}
