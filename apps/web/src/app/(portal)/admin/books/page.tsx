import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { money, date } from "@/lib/format";
import { requireUser } from "@/server/auth";

export default async function AdminBooksPage() {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) redirect("/dashboard");
  const authors = await prisma.author.findMany({
    include: { user: true, books: { orderBy: { title: "asc" } } },
    orderBy: { user: { name: "asc" } },
  });
  const books = authors.flatMap((author) => author.books.map((book) => ({ author, book })));
  const pending = books.reduce((sum, item) => sum + Number(item.book.royaltyPending), 0);
  const sold = books.reduce((sum, item) => sum + item.book.totalCopiesSold, 0);
  return <>
    <div className="pagehead"><div><div className="eyebrow">BOOKLEAF OPERATIONS</div><h1>Book catalog</h1><p>Authors, titles, distribution status and royalty snapshots.</p></div></div>
    <div className="stat-grid"><Stat label="Authors" value={authors.length} sub="In the support dataset" /><Stat label="Book titles" value={books.length} sub="Across all authors" /><Stat label="Copies sold" value={sold.toLocaleString("en-IN")} sub="Across the catalog" /><Stat label="Pending royalties" value={money(pending)} sub="Recorded in sample data" /></div>
    <div className="card">{authors.map((author) => <section className="book-catalog-author" key={author.id}><div className="card-head" style={{ padding: "0 0 13px", borderBottom: 0 }}><div><h3>{author.user.name}</h3><p>{author.user.email}{author.city ? ` · ${author.city}` : ""}</p></div><span className="muted">{author.books.length} titles</span></div>{author.books.length ? <div className="table-wrap"><table><thead><tr><th>Title</th><th>ISBN</th><th>Status</th><th>Copies sold</th><th>Earned</th><th>Paid</th><th>Pending</th><th>Last payout</th></tr></thead><tbody>{author.books.map((book) => <tr key={book.id}><td><span className="book-title">{book.title}</span><span className="muted">{book.genre}</span></td><td>{book.isbn}</td><td>{book.status}</td><td>{book.totalCopiesSold.toLocaleString("en-IN")}</td><td>{money(Number(book.totalRoyaltyEarned))}</td><td>{money(Number(book.royaltyPaid))}</td><td className={Number(book.royaltyPending) ? "pending" : ""}>{money(Number(book.royaltyPending))}</td><td>{date(book.lastRoyaltyPayoutDate)}</td></tr>)}</tbody></table></div> : <div className="empty">No titles are associated with this author.</div>}</section>)}</div>
  </>;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) { return <div className="stat"><div className="stat-label">{label}<span>↗</span></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>; }
