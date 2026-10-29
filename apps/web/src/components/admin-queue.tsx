"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleAlert, Inbox, MessagesSquare, Sparkles, StickyNote, TicketCheck, UserRoundPlus } from "lucide-react";
import { categories, categoryLabels, priorities, priorityLabels, statuses, statusLabels } from "@/server/tickets";
import { date, priorityClass, statusClass } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketAutoRefresh } from "@/components/ticket-auto-refresh";

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

export function AdminQueue({ initialTickets, initialVersion, adminId }: { initialTickets: Ticket[]; initialVersion: string; adminId: string }) {
  const router = useRouter();
  const tickets = initialTickets;
  const [selectedId, setSelectedId] = useState(initialTickets[0]?.id ?? "");
  const [filters, setFilters] = useState({ status: "", priority: "", category: "", from: "", to: "" });
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const filtered = tickets.filter((ticket) =>
    (!filters.status || ticket.status === filters.status) &&
    (!filters.priority || ticket.priority === filters.priority) &&
    (!filters.category || ticket.category === filters.category) &&
    (!filters.from || ticket.createdAt.slice(0, 10) >= filters.from) &&
    (!filters.to || ticket.createdAt.slice(0, 10) <= filters.to));
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
    <div className="pagehead"><div><div className="eyebrow">BOOKLEAF OPERATIONS</div><h1>Support queue</h1><p>Prioritize the next best action for every author.</p><TicketAutoRefresh initialVersion={initialVersion} /></div><div className="pill-row"><span className="status status-open">{active} active</span>{critical > 0 && <span className="priority priority-critical">{critical} critical</span>}</div></div>
    <div className="stat-grid"><Stat icon={<Inbox />} label="Active tickets" value={active} sub="Awaiting resolution" /><Stat icon={<CircleAlert />} label="Critical priority" value={critical} sub="Requires immediate review" /><Stat icon={<CheckCircle2 />} label="Resolved" value={tickets.filter((ticket) => ticket.status === "RESOLVED").length} sub="Across this queue" /><Stat icon={<MessagesSquare />} label="All conversations" value={tickets.length} sub="Seeded and new tickets" /></div>
    <div className="ticket-layout">
      <section className="card"><div className="card-head" style={{ display: "block" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div><h3>Inbox</h3><p>{filtered.length} conversations</p></div></div>
        <div className="filters">
          <Select value={filters.status || "all"} onValueChange={(value: string) => setFilters({ ...filters, status: value === "all" ? "" : value })}><SelectTrigger aria-label="Filter by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((status) => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}</SelectContent></Select>
          <Select value={filters.priority || "all"} onValueChange={(value: string) => setFilters({ ...filters, priority: value === "all" ? "" : value })}><SelectTrigger aria-label="Filter by priority"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All priorities</SelectItem>{priorities.map((priority) => <SelectItem key={priority} value={priority}>{priorityLabels[priority]}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="queue-category-filter"><Select value={filters.category || "all"} onValueChange={(value: string) => setFilters({ ...filters, category: value === "all" ? "" : value })}><SelectTrigger aria-label="Filter by category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((category) => <SelectItem key={category} value={category}>{categoryLabels[category]}</SelectItem>)}</SelectContent></Select></div>
        <div className="queue-date-filters"><label>From<input aria-label="Tickets from date" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>To<input aria-label="Tickets through date" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>{(filters.from || filters.to) && <button type="button" className="queue-clear-date" onClick={() => setFilters({ ...filters, from: "", to: "" })}>Clear</button>}</div>
      </div><div className="ticket-list">{filtered.length ? filtered.map((ticket) => <button type="button" className={`ticket-item ${selected?.id === ticket.id ? "selected" : ""}`} data-ticket={ticket.id} key={ticket.id} onClick={() => { setSelectedId(ticket.id); setDraft(""); setToast(""); }}><div className="ticket-item-top"><span className={`priority priority-${priorityClass(ticket.priorityLabel)}`}>{ticket.priorityLabel}</span><span className="muted" style={{ fontSize: 9 }}>{ticket.id}</span></div><h4>{ticket.subject}</h4><p>{ticket.description}</p><div className="ticket-item-foot"><span>{ticket.authorName} · {date(ticket.createdAt)}</span><span className={`status status-${statusClass(ticket.statusLabel)}`}>{ticket.statusLabel}</span></div></button>) : <div className="empty">No tickets match these filters.</div>}</div></section>
      <section className="card detail">{selected ? <>
        <div className="detail-head"><div className="detail-overline"><span>{selected.id} · {date(selected.createdAt)}</span><span className={`priority priority-${priorityClass(selected.priorityLabel)}`}>{selected.priorityLabel} priority</span></div><h2>{selected.subject}</h2><div className="detail-meta">{selected.authorName} · {selected.authorEmail}{selected.bookTitle ? ` · ${selected.bookTitle}` : " · General inquiry"}</div></div>
        <div className="detail-body"><div className="author-line"><span className="avatar author-avatar" aria-hidden="true">{initials(selected.authorName)}</span><div className="author-identity"><strong>{selected.authorName || "BookLeaf author"}</strong><span>Author{selected.authorCity ? ` · ${selected.authorCity}` : ""}</span></div></div><div className="section-mini">AUTHOR QUERY</div><div className="query-box">{selected.description}</div>
          <div className="section-mini">TRIAGE &amp; CLASSIFICATION</div><div className="pill-row"><Select value={selected.category} onValueChange={(value: string) => void update({ category: value })}><SelectTrigger aria-label="Ticket category"><SelectValue /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{categoryLabels[category]}</SelectItem>)}</SelectContent></Select><Select value={selected.priority} onValueChange={(value: string) => void update({ priority: value })}><SelectTrigger aria-label="Ticket priority"><SelectValue /></SelectTrigger><SelectContent>{priorities.map((priority) => <SelectItem key={priority} value={priority}>{priorityLabels[priority]}</SelectItem>)}</SelectContent></Select><span className="ai-tag">{selected.categorySource === "GEMINI" ? `GEMINI${selected.aiModel ? ` · ${selected.aiModel}` : ""}` : selected.categorySource === "ADMIN" ? "STAFF CLASSIFIED" : "RULES CLASSIFIED"}</span></div>{selected.aiReason && <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>{selected.aiReason}</div>}
          {selected.messages.length > 0 && <><div className="section-mini">SENT RESPONSES</div>{selected.messages.map((message) => <div className="reply-box" key={message.id}>{message.body}<div className="byline">{message.senderName} · {date(message.createdAt)}</div></div>)}</>}
          <div className="section-mini">INTERNAL NOTES</div>{selected.notes.map((item) => <div className="admin-note" key={item.id}><b>{item.authorName} · {date(item.createdAt)}</b><br />{item.body}</div>)}
          <div className="note-form"><input aria-label="Internal note" placeholder="Add a private note for your team…" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} /><button className="btn secondary small" type="button" onClick={() => void addNote()} disabled={busy === "note" || !note.trim()}>{busy === "note" ? "Adding…" : <><StickyNote size={14} />Add note</>}</button></div>
        </div>
        <div className="admin-controls"><Select value={selected.status} onValueChange={(value: string) => void update({ status: value })}><SelectTrigger aria-label="Ticket status"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}</SelectContent></Select><button className="btn secondary small" type="button" onClick={() => void update({ assignedToId: selected.assignedToId ? null : adminId })} disabled={busy === "update"}>{selected.assignedToId ? <><TicketCheck size={14} />Assigned: {selected.assignedToName ?? "you"}</> : <><UserRoundPlus size={14} />Assign to me</>}</button><span className="spacer" /><span className="muted" style={{ fontSize: 9 }}>{selected.assignedToName ? `Owned by ${selected.assignedToName}` : "Unassigned"}</span></div>
        <div className="compose"><div className="compose-top"><div><b>Reply to author</b><span className="compose-hint">A clear, personal response goes a long way.</span></div><button type="button" onClick={() => void generateDraft()} className="btn secondary small" disabled={busy === "draft"}>{busy === "draft" ? "Drafting…" : <><Sparkles size={14} />Generate draft</>}</button></div><textarea aria-label="Reply to author" placeholder={`Write a reply to ${selected.authorName || "the author"}, or generate a draft to get started…`} value={draft} maxLength={5000} onChange={(event) => setDraft(event.target.value)} /><div className="compose-actions"><span>AI suggestions are a starting point. Review details before sending.</span><button className="btn small" type="button" onClick={() => void sendReply()} disabled={busy === "reply" || !draft.trim()}>{busy === "reply" ? "Sending…" : <>Send response<ArrowRight size={14} /></>}</button></div></div>
      </> : <div className="detail-empty"><div><Inbox size={34} strokeWidth={1.5} /><span>Select a conversation to review the author’s question and prepare a response.</span></div></div>}</section>
    </div>{toast && <div className="toast show" role="status">{toast}</div>}
  </>;
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub: string }) { return <div className="stat"><div className="stat-label">{label}<span className="queue-stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>; }
function initials(name: string) { return name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BL"; }
