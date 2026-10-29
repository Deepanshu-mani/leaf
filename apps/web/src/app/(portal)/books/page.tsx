import { redirect } from "next/navigation";
import { BookOpen, Boxes, IndianRupee, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { money, date } from "@/lib/format";
import { requireUser } from "@/server/auth";

export default async function BooksPage() {
  const user = await requireUser();
  if (user.role === UserRole.ADMIN) redirect("/admin/books");
  const author = await prisma.author.findUnique({
    where: { userId: user.id },
    include: { books: { include: { availability: true }, orderBy: { title: "asc" } } },
  });
  const books = author?.books ?? [];
  const copies = books.reduce((sum, book) => sum + book.totalCopiesSold, 0);
  const earned = books.reduce((sum, book) => sum + Number(book.totalRoyaltyEarned), 0);
  const pending = books.reduce((sum, book) => sum + Number(book.royaltyPending), 0);
  return <>
    <div className="pagehead"><div><div className="eyebrow">YOUR CATALOG</div><h1>My books</h1><p>Your titles, sales and royalty details in one place.</p></div></div>
    <div className="stat-grid"><Stat icon={<BookOpen />} label="All titles" value={books.length} sub="Published and in production" /><Stat icon={<Boxes />} label="Copies sold" value={copies.toLocaleString("en-IN")} sub="Across your catalog" /><Stat icon={<IndianRupee />} label="Royalties earned" value={money(earned)} sub="Total reported" /><Stat icon={<Wallet />} label="Pending royalties" value={money(pending)} sub="Amounts not yet paid" /></div>
    {books.length ? <div className="book-grid">{books.map((book) => <article className="book-card" key={book.id}><div className="book-card-top"><div><h3>{book.title}</h3><div className="book-sub">{book.isbn}</div></div><span className={`status ${book.status === "Published & Live" ? "status-resolved" : "status-progress"}`}>{book.status === "Published & Live" ? "Live" : "In production"}</span></div><div className="book-gen">{book.genre} · Published {date(book.publicationDate)}</div><div className="book-metrics"><Metric label="MRP" value={money(book.mrp === null ? null : Number(book.mrp))} /><Metric label="COPIES SOLD" value={book.totalCopiesSold.toLocaleString("en-IN")} /><Metric label="ROYALTY EARNED" value={money(Number(book.totalRoyaltyEarned))} /><Metric label="ROYALTY PAID" value={money(Number(book.royaltyPaid))} /><Metric label="PENDING" value={money(Number(book.royaltyPending))} pending={Number(book.royaltyPending) > 0} /><Metric label="LAST PAYOUT" value={date(book.lastRoyaltyPayoutDate)} /></div><div className="book-gen">Print partner: {book.printPartner ?? "To be assigned"}</div><div className="pill-row" style={{ marginTop: 12 }}>{book.availability.map((item) => <span className="category-tag" style={{ background: "#f2f3ef", color: "#788079" }} key={item.channel}>{item.channel.replaceAll("_", " ")}</span>)}</div></article>)}</div> : <div className="card empty">Your book details will appear here.</div>}
    <div className="notice"><span className="notice-icon">i</span><span>Royalties are calculated quarterly and paid within 45 days of the quarter ending. Balances below ₹1,000 roll over to the next quarter. Review your linked bank details before the next payout.</span></div>
  </>;
}

function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string | number; sub: string }) { return <div className="stat"><div className="stat-label">{label}<span className="queue-stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>; }
function Metric({ label, value, pending = false }: { label: string; value: string; pending?: boolean }) { return <div><div className="metric-label">{label}</div><div className={`metric-value ${pending ? "pending" : ""}`}>{value}</div></div>; }
