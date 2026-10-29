"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import { date } from "@/lib/format";

type Person = {
  id: string; name: string; email: string; role: "AUTHOR" | "ADMIN"; isActive: boolean; isSuperAdmin: boolean;
  joinedAt: string; profileImageType: string | null; city: string | null; phone: string | null;
  books: number; tickets: number; assignedTickets: number;
};
type Tab = "ALL" | "ADMIN" | "AUTHOR";

export function AdminPeople({ people, currentUserId, canManageTeam }: { people: Person[]; currentUserId: string; canManageTeam: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const visible = useMemo(() => people.filter((person) => {
    const matchesRole = tab === "ALL" || person.role === tab;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [person.name, person.email, person.city ?? "", person.phone ?? ""].some((value) => value.toLowerCase().includes(term));
    return matchesRole && matchesSearch;
  }), [people, search, tab]);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (deleteTarget && !dialog.open) dialog.showModal();
    else if (!deleteTarget && dialog.open) dialog.close();
  }, [deleteTarget]);

  async function setActive(person: Person, isActive: boolean) {
    setBusyId(person.id); setError("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(person.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not update team access.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update team access."); }
    finally { setBusyId(""); }
  }

  async function deleteMember(person: Person) {
    setBusyId(person.id); setError("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(person.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not delete this team member.");
      setDeleteTarget(null);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete this team member."); }
    finally { setBusyId(""); }
  }

  return <>
    <div className="people-toolbar"><div className="people-tabs" role="tablist" aria-label="People type">{(["ALL", "ADMIN", "AUTHOR"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value === "ALL" ? "Everyone" : value === "ADMIN" ? "Team" : "Authors"}<span>{value === "ALL" ? people.length : people.filter((person) => person.role === value).length}</span></button>)}</div><label className="people-search"><Search size={16} aria-hidden="true" /><input type="search" placeholder="Search name, email, or city…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search people" /></label></div>
    {error && !deleteTarget && <div className="error people-management-error" role="alert">{error}</div>}
    <div className="people-list">{visible.map((person) => <article className="card person-card" key={person.id}><div className="person-avatar">{person.profileImageType ? <Image src={`/api/users/${encodeURIComponent(person.id)}/avatar?v=${encodeURIComponent(person.joinedAt)}`} alt="" width={48} height={48} unoptimized /> : initials(person.name)}</div><div className="person-main"><div className="person-name-row"><h2>{person.name}</h2><span className={`person-role ${person.role === "ADMIN" ? "team" : "author"}`}>{person.role === "AUTHOR" ? "Author" : person.isSuperAdmin ? <><ShieldCheck size={12} />Admin</> : "Team member"}</span><span className={`person-account ${person.isActive ? "active" : "inactive"}`}>{person.isActive ? "Active" : "Inactive"}</span></div><div className="person-contact"><a href={`mailto:${person.email}`}>{person.email}</a>{person.city && <span>{person.city}</span>}{person.phone && <a href={`tel:${person.phone}`}>{person.phone}</a>}</div><div className="person-metrics">{person.role === "AUTHOR" ? <><span><b>{person.books}</b> {person.books === 1 ? "book" : "books"}</span><span><b>{person.tickets}</b> {person.tickets === 1 ? "support ticket" : "support tickets"}</span></> : <span><b>{person.assignedTickets}</b> assigned {person.assignedTickets === 1 ? "ticket" : "tickets"}</span>}<span>Joined {date(person.joinedAt)}</span></div></div>{canManageTeam && person.role === "ADMIN" && !person.isSuperAdmin && person.id !== currentUserId && <div className="person-actions">{person.isActive ? <button type="button" className="person-action" disabled={busyId === person.id} onClick={() => void setActive(person, false)}><UserRoundX size={14} />{busyId === person.id ? "Saving…" : "Deactivate"}</button> : <><button type="button" className="person-action" disabled={busyId === person.id} onClick={() => void setActive(person, true)}><UserRoundCheck size={14} />{busyId === person.id ? "Saving…" : "Reactivate"}</button><button type="button" className="person-action destructive" disabled={busyId === person.id} onClick={() => { setError(""); setDeleteTarget(person); }}><Trash2 size={14} />Delete</button></>}</div>}</article>)}{visible.length === 0 && <div className="card empty people-empty">No people match your search.</div>}</div>
    <dialog ref={deleteDialogRef} className="team-delete-dialog" aria-labelledby="team-delete-title" aria-describedby="team-delete-description" onCancel={(event) => { if (deleteTarget && busyId === deleteTarget.id) event.preventDefault(); }} onClose={() => { if (deleteTarget) setDeleteTarget(null); }} onClick={(event) => { if (event.target === event.currentTarget && !busyId) setDeleteTarget(null); }}>
      {deleteTarget && <div className="team-delete-content"><div className="team-delete-icon"><Trash2 size={19} /></div><div className="eyebrow">REMOVE TEAM ACCESS</div><h2 id="team-delete-title">Delete {deleteTarget.name}?</h2><p id="team-delete-description">This permanently removes the inactive team account and frees <strong>{deleteTarget.email}</strong> for a new invite.</p><div className="team-delete-impact"><span>Assigned tickets</span><strong>{deleteTarget.assignedTickets} · will be unassigned</strong><span>Historical activity</span><strong>Kept with {deleteTarget.name}’s name</strong></div>{error && <div className="team-delete-error" role="alert">{error}</div>}<div className="team-delete-actions"><button type="button" className="btn ghost" disabled={busyId === deleteTarget.id} onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="btn team-delete-confirm" disabled={busyId === deleteTarget.id} onClick={() => void deleteMember(deleteTarget)}><Trash2 size={14} />{busyId === deleteTarget.id ? "Deleting…" : "Delete account"}</button></div></div>}
    </dialog>
  </>;
}

function initials(name: string) { return name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BL"; }
