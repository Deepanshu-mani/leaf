"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { date } from "@/lib/format";

type Person = {
  id: string; name: string; email: string; role: "AUTHOR" | "ADMIN"; isActive: boolean;
  joinedAt: string; profileImageType: string | null; city: string | null; phone: string | null;
  books: number; tickets: number; assignedTickets: number;
};
type Tab = "ALL" | "ADMIN" | "AUTHOR";

export function AdminPeople({ people }: { people: Person[] }) {
  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const visible = useMemo(() => people.filter((person) => {
    const matchesRole = tab === "ALL" || person.role === tab;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [person.name, person.email, person.city ?? "", person.phone ?? ""].some((value) => value.toLowerCase().includes(term));
    return matchesRole && matchesSearch;
  }), [people, search, tab]);

  return <>
    <div className="people-toolbar"><div className="people-tabs" role="tablist" aria-label="People type">{(["ALL", "ADMIN", "AUTHOR"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value === "ALL" ? "Everyone" : value === "ADMIN" ? "Team" : "Authors"}<span>{value === "ALL" ? people.length : people.filter((person) => person.role === value).length}</span></button>)}</div><label className="people-search"><Search size={16} aria-hidden="true" /><input type="search" placeholder="Search name, email, or city…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search people" /></label></div>
    <div className="people-list">{visible.map((person) => <article className="card person-card" key={person.id}><div className="person-avatar">{person.profileImageType ? <Image src={`/api/users/${encodeURIComponent(person.id)}/avatar?v=${encodeURIComponent(person.joinedAt)}`} alt="" width={48} height={48} unoptimized /> : initials(person.name)}</div><div className="person-main"><div className="person-name-row"><h2>{person.name}</h2><span className={`person-role ${person.role === "ADMIN" ? "team" : "author"}`}>{person.role === "ADMIN" ? "Team member" : "Author"}</span><span className={`person-account ${person.isActive ? "active" : "inactive"}`}>{person.isActive ? "Active" : "Inactive"}</span></div><div className="person-contact"><a href={`mailto:${person.email}`}>{person.email}</a>{person.city && <span>{person.city}</span>}{person.phone && <a href={`tel:${person.phone}`}>{person.phone}</a>}</div><div className="person-metrics">{person.role === "AUTHOR" ? <><span><b>{person.books}</b> {person.books === 1 ? "book" : "books"}</span><span><b>{person.tickets}</b> {person.tickets === 1 ? "support ticket" : "support tickets"}</span></> : <span><b>{person.assignedTickets}</b> assigned {person.assignedTickets === 1 ? "ticket" : "tickets"}</span>}<span>Joined {date(person.joinedAt)}</span></div></div></article>)}{visible.length === 0 && <div className="card empty people-empty">No people match your search.</div>}</div>
  </>;
}

function initials(name: string) { return name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BL"; }
