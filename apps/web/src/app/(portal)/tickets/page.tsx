import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { NewTicketForm } from "@/components/new-ticket-form";
import { prisma } from "@/lib/prisma";
import { date, priorityClass, statusClass } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { categoryLabels, priorityLabels, statusLabels } from "@/server/tickets";

export default async function TicketsPage() {
  const user = await requireUser();
  if (user.role === UserRole.ADMIN) redirect("/admin/queue");
  const author = await prisma.author.findUnique({
    where: { userId: user.id },
    include: { books: { select: { id: true, title: true }, orderBy: { title: "asc" } }, tickets: { include: { book: true, messages: { include: { sender: true }, orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } } },
  });
  return <>
    <div className="pagehead"><div><div className="eyebrow">SUPPORT, WITH CONTEXT</div><h1>My conversations</h1><p>Follow every question and response from your BookLeaf team.</p></div><a className="btn" href="#new-ticket">＋ &nbsp;New conversation</a></div>
    <div className="ticket-thread">{author?.tickets.length ? author.tickets.map((ticket) => <article className="card thread-card" key={ticket.id}><div className="thread-card-head"><span className="avatar">{user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><div className="thread-info"><strong>{user.name}</strong><span>{date(ticket.createdAt)} · {ticket.id}</span></div><span className={`status status-${statusClass(statusLabels[ticket.status])}`}>{statusLabels[ticket.status]}</span></div><h3>{ticket.subject}</h3><div className="body">{ticket.description}</div><div className="pill-row" style={{ marginTop: 12 }}><span className={`priority priority-${priorityClass(priorityLabels[ticket.priority])}`}>{priorityLabels[ticket.priority]} priority</span><span className="category-tag" style={{ background: "#f2f3ef", color: "#788079" }}>{categoryLabels[ticket.category]}</span>{ticket.book && <span className="category-tag" style={{ background: "#f2f3ef", color: "#788079" }}>{ticket.book.title}</span>}</div>{ticket.messages.length ? ticket.messages.map((message) => <div className="thread-reply" key={message.id}><div className="section-mini">BOOKLEAF SUPPORT · {date(message.createdAt)}</div><div className="body">{message.body}</div><div className="byline">— {message.sender.name}</div></div>) : <div className="thread-reply"><div className="section-mini">NEXT STEP</div><div className="body">Your request is with our team. We’ll post a response here as soon as we have an update.</div></div>}</article>) : <div className="card empty">No tickets yet. Start a conversation and our team will help.</div>}</div>
    <div style={{ marginTop: 22 }}><NewTicketForm books={author?.books ?? []} /></div>
  </>;
}
