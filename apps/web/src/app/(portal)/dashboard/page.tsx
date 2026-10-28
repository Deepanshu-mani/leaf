import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { date, money, statusClass } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { categoryLabels, priorityLabels, statusLabels } from "@/server/tickets";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === UserRole.ADMIN) redirect("/admin/queue");
  const author = await prisma.author.findUnique({
    where: { userId: user.id },
    include: {
      books: { orderBy: { title: "asc" } },
      tickets: { include: { book: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 4 },
    },
  });
  const books = author?.books ?? [];
  const ticketCount = author ? await prisma.ticket.count({ where: { authorId: author.id, status: { in: ["OPEN", "IN_PROGRESS"] } } }) : 0;
  const earned = books.reduce((sum, book) => sum + Number(book.totalRoyaltyEarned), 0);
  const pending = books.reduce((sum, book) => sum + Number(book.royaltyPending), 0);
  const sold = books.reduce((sum, book) => sum + book.totalCopiesSold, 0);
  const greeting = new Intl.DateTimeFormat("en", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date());
  const hour = Number(greeting);
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return <>
    <div className="pagehead"><div><div className="eyebrow">YOUR PUBLISHING DESK</div><h1>{salutation}, {user.name.split(" ")[0]}.</h1><p>A clear view of your books and the people helping you publish.</p></div><Link className="btn" href="/tickets#new-ticket">＋ &nbsp;Ask BookLeaf</Link></div>
    <div className="stat-grid">
      <Stat label="Published titles" value={books.length} sub="Across your BookLeaf catalog" />
      <Stat label="Copies sold" value={sold.toLocaleString("en-IN")} sub="All-time reported sales" image="/brand/live-sales-report.png" />
      <Stat label="Royalties pending" value={money(pending)} sub={`₹${earned.toLocaleString("en-IN")} earned so far`} image="/brand/highest-royalty.png" />
      <Stat label="Open conversations" value={ticketCount} sub={ticketCount ? "Our team is on it" : "You’re all caught up"} />
    </div>
    <div className="card"><div className="card-head"><div><h3>Your books</h3><p>Sales and royalty snapshot</p></div><Link className="link-btn" href="/books">View all books →</Link></div><BookTable books={books.slice(0, 5)} /></div>
    <div className="card" style={{ marginTop: 17 }}><div className="card-head"><div><h3>Recent conversations</h3><p>Updates from your BookLeaf support team</p></div><Link className="link-btn" href="/tickets">View all →</Link></div>
      {author?.tickets.length ? <div className="ticket-thread">{author.tickets.map((ticket) => <article className="thread-card" key={ticket.id}><div className="thread-card-head"><span className="avatar">{user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><div className="thread-info"><strong>{user.name}</strong><span>{date(ticket.createdAt)} · {ticket.id}</span></div><span className={`status status-${statusClass(statusLabels[ticket.status])}`}>{statusLabels[ticket.status]}</span></div><h3>{ticket.subject}</h3><div className="body">{ticket.description}</div><div className="pill-row" style={{ marginTop: 12 }}><span className={`priority priority-${priorityLabels[ticket.priority].toLowerCase()}`}>{priorityLabels[ticket.priority]} priority</span><span className="category-tag" style={{ background: "#f2f3ef", color: "#788079" }}>{categoryLabels[ticket.category]}</span></div>{ticket.messages[0] && <div className="thread-reply"><div className="section-mini">BOOKLEAF SUPPORT · {date(ticket.messages[0].createdAt)}</div><div className="body">{ticket.messages[0].body}</div></div>}</article>)}</div> : <div className="empty">No conversations yet. We’re here when you need us.</div>}
    </div>
  </>;
}

function Stat({ label, value, sub, image }: { label: string; value: string | number; sub: string; image?: string }) {
  return <div className="stat"><div className="stat-label">{label}<span>{image ? <Image className="stat-art" src={image} alt="" width={24} height={24} /> : "↗"}</span></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>;
}

function BookTable({ books }: { books: Array<{ id: string; title: string; genre: string; isbn: string; status: string; totalCopiesSold: number; totalRoyaltyEarned: unknown; royaltyPaid: unknown; royaltyPending: unknown }> }) {
  return books.length ? <div className="table-wrap"><table><thead><tr><th>Title</th><th>ISBN</th><th>Status</th><th>Copies sold</th><th>Earned</th><th>Paid</th><th>Pending</th></tr></thead><tbody>{books.map((book) => <tr key={book.id}><td><span className="book-title">{book.title}</span><span className="muted">{book.genre}</span></td><td>{book.isbn}</td><td><span className={`status status-${book.status === "Published & Live" ? "resolved" : "progress"}`}>{book.status}</span></td><td>{book.totalCopiesSold.toLocaleString("en-IN")}</td><td className="money">{money(Number(book.totalRoyaltyEarned))}</td><td className="money">{money(Number(book.royaltyPaid))}</td><td className={`money ${Number(book.royaltyPending) ? "pending" : ""}`}>{money(Number(book.royaltyPending))}</td></tr>)}</tbody></table></div> : <div className="empty">Your book details will appear here.</div>;
}
