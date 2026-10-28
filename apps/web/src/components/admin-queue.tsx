"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categories, categoryLabels, priorities, priorityLabels, statuses, statusLabels } from "@/server/tickets";
import { date, priorityClass, statusClass } from "@/lib/format";

type Ticket = {
  id: string; authorId: string; authorName: string; authorEmail: string; authorCity: string | null;
  bookId: string | null; bookTitle: string | null; subject: string; description: string;
  category: keyof typeof categoryLabels; categoryLabel: string;
  priority: keyof typeof priorityLabels; priorityLabel: string;
  status: keyof typeof statusLabels; statusLabel: string;
  categorySource: string; prioritySource: string; aiCategory: string | null; aiPriority: string | null;
  aiReason: string | null; aiModel: string | null; assignedToId: string | null; assignedToName: string | null;
  createdAt: string; messages: Array<{ id: string; body: string; createdAt: string; senderName: string }>;
  notes: Array<{ id: string; body: string; createdAt: string; authorName: string }>;
};

export function AdminQueue({ initialTickets, adminId }: { initialTickets: Ticket[]; adminId: string }) {
  const router = useRouter();
  const tickets = initialTickets;
  const [selectedId, setSelectedId] = useState(initialTickets[0]?.id ?? "");
  const [filters, setFilters] = useState({ status: "", priority: "", category: "" });
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const filtered = tickets.filter((ticket) =>
    (!filters.status || ticket.status === filters.status) &&
    (!filters.priority || ticket.priority === filters.priority) &&
    (!filters.category || ticket.category === filters.category));
  const selected = filtered.find((ticket) => ticket.id === selectedId) ?? filtered[0];
  const active = tickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const critical = tickets.filter((ticket) => ticket.priority === "CRITICAL" && !["RESOLVED", "CLOSED"].includes(ticket.status)).length;

  async function request(url: string, method: string, body?: object) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The update could not be saved.");
    router.refresh();
    return result;
  }
  async function update(data: object) {
    if (!selected) return;
    setBusy("update"); setToast("");
    try { await request(`/api/tickets/${encodeURIComponent(selected.id)}`, "PATCH", data); setToast("Ticket updated."); }
    catch (error) { setToast(error instanceof Error ? error.message : "Ticket update failed."); }
    finally { setBusy(""); }
  }
  async function generateDraft() {
    if (!selected) return;
    setBusy("draft"); setToast("");
    try { const result = await request(`/api/tickets/${encodeURIComponent(selected.id)}/draft`, "POST", {}); setDraft(result.draft); setToast(result.source === "GEMINI" ? `Gemini draft ready${result.model ? ` · ${result.model}` : ""}. Review before sending.` : "Suggested draft ready. Review before sending."); }
    catch (error) { setToast(error instanceof Error ? error.message : "Draft generation failed."); }
    finally { setBusy(""); }
  }
  async function addNote() {
    if (!selected || !note.trim()) return;
    setBusy("note"); setToast("");
    try { await request(`/api/tickets/${encodeURIComponent(selected.id)}/notes`, "POST", { text: note }); setNote(""); setToast("Internal note added."); }
    catch (error) { setToast(error instanceof Error ? error.message : "Could not add note."); }
    finally { setBusy(""); }
  }
  async function sendReply() {
    if (!selected || !draft.trim()) return;
    setBusy("reply"); setToast("");
    try { await request(`/api/tickets/${encodeURIComponent(selected.id)}/messages`, "POST", { text: draft }); setDraft(""); setToast("Response sent to the author."); }
    catch (error) { setToast(error instanceof Error ? error.message : "Could not send response."); }
    finally { setBusy(""); }
  }

  return <>
    <div className="pagehead"><div><div className="eyebrow">BOOKLEAF OPERATIONS</div><h1>Support queue</h1><p>Prioritize the next best action for every author.</p></div><div className="pill-row"><span className="status status-open">{active} active</span>{critical > 0 && <span className="priority priority-critical">{critical} critical</span>}</div></div>
    <div className="stat-grid"><Stat label="Active tickets" value={active} sub="Awaiting resolution" /><Stat label="Critical priority" value={critical} sub="Requires immediate review" /><Stat label="Resolved" value={tickets.filter((ticket) => ticket.status === "RESOLVED").length} sub="Across this queue" /><Stat label="All conversations" value={tickets.length} sub="Seeded and new tickets" /></div>
    <div className="ticket-layout">
      <section className="card"><div className="card-head" style={{ display: "block" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div><h3>Inbox</h3><p>{filtered.length} conversations</p></div></div>
        <div className="filters"><select aria-label="Filter by status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><select aria-label="Filter by priority" value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}><option value="">All priorities</option>{priorities.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}</select></div>
        <select aria-label="Filter by category" style={{ marginTop: 8, width: "100%" }} value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option>{categories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select>
      </div><div className="ticket-list">{filtered.length ? filtered.map((ticket) => <button type="button" className={`ticket-item ${selected?.id === ticket.id ? "selected" : ""}`} data-ticket={ticket.id} key={ticket.id} onClick={() => { setSelectedId(ticket.id); setDraft(""); setToast(""); }}><div className="ticket-item-top"><span className={`priority priority-${priorityClass(ticket.priorityLabel)}`}>{ticket.priorityLabel}</span><span className="muted" style={{ fontSize: 9 }}>{ticket.id}</span></div><h4>{ticket.subject}</h4><p>{ticket.description}</p><div className="ticket-item-foot"><span>{ticket.authorName} · {date(ticket.createdAt)}</span><span className={`status status-${statusClass(ticket.statusLabel)}`}>{ticket.statusLabel}</span></div></button>) : <div className="empty">No tickets match these filters.</div>}</div></section>
      <section className="card detail">{selected ? <>
        <div className="detail-head"><div className="detail-overline"><span>{selected.id} · {date(selected.createdAt)}</span><span className={`priority priority-${priorityClass(selected.priorityLabel)}`}>{selected.priorityLabel} priority</span></div><h2>{selected.subject}</h2><div className="detail-meta">{selected.authorName} · {selected.authorEmail}{selected.bookTitle ? ` · ${selected.bookTitle}` : " · General inquiry"}</div></div>
        <div className="detail-body"><div className="author-line"><span className="avatar">{initials(selected.authorName)}</span><div><strong>{selected.authorName}</strong><span>Author{selected.authorCity ? ` · ${selected.authorCity}` : ""}</span></div></div><div className="section-mini">AUTHOR QUERY</div><div className="query-box">{selected.description}</div>
          <div className="section-mini">TRIAGE &amp; CLASSIFICATION</div><div className="pill-row"><select aria-label="Ticket category" value={selected.category} onChange={(event) => void update({ category: event.target.value })}>{categories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select><select aria-label="Ticket priority" value={selected.priority} onChange={(event) => void update({ priority: event.target.value })}>{priorities.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}</select><span className="ai-tag">{selected.categorySource === "GEMINI" ? `GEMINI${selected.aiModel ? ` · ${selected.aiModel}` : ""}` : selected.categorySource === "ADMIN" ? "STAFF CLASSIFIED" : "RULES CLASSIFIED"}</span></div>{selected.aiReason && <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>{selected.aiReason}</div>}
          {selected.messages.length > 0 && <><div className="section-mini">SENT RESPONSES</div>{selected.messages.map((message) => <div className="reply-box" key={message.id}>{message.body}<div className="byline">{message.senderName} · {date(message.createdAt)}</div></div>)}</>}
          <div className="section-mini">INTERNAL NOTES</div>{selected.notes.map((item) => <div className="admin-note" key={item.id}><b>{item.authorName} · {date(item.createdAt)}</b><br />{item.body}</div>)}
          <div className="note-form"><input aria-label="Internal note" placeholder="Add a note for your team…" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} /><button className="btn secondary small" type="button" onClick={() => void addNote()} disabled={busy === "note" || !note.trim()}>{busy === "note" ? "Adding…" : "Add note"}</button></div>
        </div>
        <div className="admin-controls"><select aria-label="Ticket status" value={selected.status} onChange={(event) => void update({ status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><button className="btn secondary small" type="button" onClick={() => void update({ assignedToId: selected.assignedToId ? null : adminId })} disabled={busy === "update"}>{selected.assignedToId ? `Assigned: ${selected.assignedToName ?? "you"}` : "Assign to me"}</button><span className="spacer" /><span className="muted" style={{ fontSize: 9 }}>{selected.assignedToName ? `Owned by ${selected.assignedToName}` : "Unassigned"}</span></div>
        <div className="compose"><div className="compose-top"><b>Reply to author</b><button type="button" onClick={() => void generateDraft()} className="btn secondary small" disabled={busy === "draft"}>{busy === "draft" ? "Drafting…" : "✧ Generate Gemini draft"}</button></div><textarea aria-label="Reply to author" placeholder="Write a thoughtful response. Generate a draft to get started…" value={draft} maxLength={5000} onChange={(event) => setDraft(event.target.value)} /><div className="compose-actions"><span>Review AI generated text before sending.</span><button className="btn small" type="button" onClick={() => void sendReply()} disabled={busy === "reply" || !draft.trim()}>{busy === "reply" ? "Sending…" : "Send response →"}</button></div></div>
      </> : <div className="detail-empty"><div><i>✧</i>Select a conversation to review the author’s question and prepare a response.</div></div>}</section>
    </div>{toast && <div className="toast show" role="status">{toast}</div>}
  </>;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) { return <div className="stat"><div className="stat-label">{label}<span>↗</span></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>; }
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
