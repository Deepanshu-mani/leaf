"use client";

import { useState, type FormEvent } from "react";
import { Check, Clipboard, MailPlus, Shield, UserRoundPlus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PendingInvite = { id: string; email: string; name: string; role: "ADMIN" | "AUTHOR"; expiresAt: string };

export function AdminInvitePanel({ initialInvites }: { initialInvites: PendingInvite[] }) {
  const [role, setRole] = useState<"ADMIN" | "AUTHOR">("AUTHOR");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState("");
  const [error, setError] = useState("");
  const [invites, setInvites] = useState(initialInvites);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setError(""); setInviteUrl(""); setCopied(false);
    const data = new FormData(form);
    try {
      const response = await fetch("/api/admin/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), email: data.get("email"), role, city: data.get("city") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The invitation could not be created.");
      setInviteUrl(result.inviteUrl);
      setInvites((current) => [{ id: crypto.randomUUID(), name: String(data.get("name")), email: String(data.get("email")), role, expiresAt: result.expiresAt }, ...current]);
      form.reset();
      setRole("AUTHOR");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The invitation could not be created.");
    } finally { setBusy(false); }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  async function revokeInvite(id: string) {
    setRevoking(id); setError("");
    try {
      const response = await fetch(`/api/admin/invites/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The invite could not be revoked.");
      setInvites((current) => current.filter((invite) => invite.id !== id));
      setInviteUrl("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The invite could not be revoked."); }
    finally { setRevoking(""); }
  }

  return (
    <div className="people-admin-grid">
      <section className="card invite-card">
        <div className="card-head invite-card-head"><div className="invite-head-icon"><MailPlus size={18} /></div><div><h3>Invite someone</h3><p>Create a secure, one-time setup link for a teammate or author.</p></div></div>
        <form className="invite-form" onSubmit={submit}>
          <label className="field"><span>Full name</span><input name="name" autoComplete="name" minLength={2} maxLength={100} placeholder="e.g. Priya Sharma" required /></label>
          <label className="field"><span>Email address</span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="name@example.com" required /></label>
          <label className="field"><span>Account type</span><Select value={role} onValueChange={(value: string) => setRole(value as "ADMIN" | "AUTHOR")}><SelectTrigger aria-label="Account type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AUTHOR">Author</SelectItem><SelectItem value="ADMIN">Team member</SelectItem></SelectContent></Select></label>
          {role === "AUTHOR" && <label className="field"><span>City <small>Optional</small></span><input name="city" autoComplete="address-level2" maxLength={100} placeholder="City" /></label>}
          {error && <p className="invite-error" role="alert">{error}</p>}
          <button className="btn invite-submit" disabled={busy}>{busy ? "Creating invitation…" : <><UserRoundPlus size={15} />Create invite link</>}</button>
        </form>
        {inviteUrl && <div className="invite-link-result" role="status"><div><Check size={15} /><span>Invite created. Share this link within 7 days.</span></div><code>{inviteUrl}</code><button type="button" className="btn secondary small" onClick={() => void copyInvite()}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Copied" : "Copy invite link"}</button></div>}
        <div className="invite-security-note"><Shield size={14} /><span>Links expire after 7 days and can only be used once. The account type is fixed by the invitation.</span></div>
      </section>

      <section className="card invite-list-card">
        <div className="card-head"><div><h3>Pending invitations</h3><p>{invites.length} active {invites.length === 1 ? "link" : "links"}</p></div><span className="invite-count">{invites.length}</span></div>
        {invites.length ? <div className="invite-list">{invites.map((invite) => <article className="invite-row" key={invite.id}><div className="invite-avatar">{invite.role === "ADMIN" ? <Shield size={16} /> : <MailPlus size={16} />}</div><div className="invite-recipient"><strong>{invite.name}</strong><span>{invite.email}</span></div><span className={`person-role ${invite.role === "ADMIN" ? "team" : "author"}`}>{invite.role === "ADMIN" ? "Team member" : "Author"}</span><small>Expires {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(invite.expiresAt))}</small><button className="invite-revoke" type="button" aria-label={`Revoke invitation for ${invite.email}`} title="Revoke invitation" disabled={revoking === invite.id} onClick={() => void revokeInvite(invite.id)}><X size={14} /></button></article>)}</div> : <div className="invite-empty">No pending invitations. New links will appear here.</div>}
        {error && <p className="invite-error invite-list-error" role="alert">{error}</p>}
        <p className="invite-delivery-note">Email delivery isn’t configured yet, so copy and share each link yourself.</p>
      </section>
    </div>
  );
}
