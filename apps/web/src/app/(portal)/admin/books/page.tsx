import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Boxes, IndianRupee, LibraryBig, Search } from "lucide-react";
import type { ReactNode } from "react";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { money, date } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const PAGE_SIZES = [25, 50, 100];

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function catalogUrl(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/admin/books?${query}` : "/admin/books";
}

export default async function AdminBooksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) redirect("/dashboard");

  const params = await searchParams;
  const query = (single(params.q) ?? "").trim().slice(0, 120);
  const requestedStatus = single(params.status) ?? "all";
  const requestedGenre = single(params.genre) ?? "all";
  const requestedSize = Number(single(params.size));
  const pageSize = PAGE_SIZES.includes(requestedSize) ? requestedSize : 25;
  const requestedPage = Number(single(params.page));

  const where = {
    ...(requestedStatus !== "all" ? { status: requestedStatus } : {}),
    ...(requestedGenre !== "all" ? { genre: requestedGenre } : {}),
    ...(query ? {
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { isbn: { contains: query, mode: "insensitive" as const } },
        { genre: { contains: query, mode: "insensitive" as const } },
        { author: { is: { user: { is: { name: { contains: query, mode: "insensitive" as const } } } } } },
        { author: { is: { user: { is: { email: { contains: query, mode: "insensitive" as const } } } } } },
      ],
    } : {}),
  };

  const [total, summary, authorCount, genres, statuses] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.aggregate({ _count: { _all: true }, _sum: { totalCopiesSold: true, royaltyPending: true } }),
    prisma.author.count(),
    prisma.$queryRaw<Array<{ genre: string }>>`SELECT DISTINCT "genre" FROM "books" ORDER BY "genre" LIMIT 100`,
    prisma.$queryRaw<Array<{ status: string }>>`SELECT DISTINCT "status" FROM "books" ORDER BY "status" LIMIT 50`,
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1), pageCount);
  const books = await prisma.book.findMany({
    where,
    select: {
      id: true, title: true, genre: true, isbn: true, status: true, totalCopiesSold: true,
      totalRoyaltyEarned: true, royaltyPaid: true, royaltyPending: true, lastRoyaltyPayoutDate: true,
      author: { select: { city: true, user: { select: { name: true, email: true } } } },
    },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  const retained = { q: query || undefined, status: requestedStatus === "all" ? undefined : requestedStatus, genre: requestedGenre === "all" ? undefined : requestedGenre, size: pageSize };

  return (
    <>
      <div className="pagehead catalog-pagehead">
        <div>
          <div className="eyebrow">BOOKLEAF OPERATIONS</div>
          <h1>Book catalog</h1>
          <p>Search, review and manage title performance across the publishing catalog.</p>
        </div>
        <div className="catalog-volume"><LibraryBig size={17} aria-hidden="true" /><span><strong>{summary._count._all.toLocaleString("en-IN")}</strong> titles tracked</span></div>
      </div>

      <section className="catalog-stat-grid" aria-label="Catalog overview">
        <Stat icon={<LibraryBig />} label="Authors" value={authorCount.toLocaleString("en-IN")} note="Publishing accounts" />
        <Stat icon={<BookOpen />} label="Book titles" value={summary._count._all.toLocaleString("en-IN")} note="Across all authors" />
        <Stat icon={<Boxes />} label="Copies sold" value={(summary._sum.totalCopiesSold ?? 0).toLocaleString("en-IN")} note="Recorded in the catalog" />
        <Stat icon={<IndianRupee />} label="Pending royalties" value={money(Number(summary._sum.royaltyPending ?? 0))} note="Awaiting payout" accent />
      </section>

      <section className="catalog-workspace" aria-label="Book records">
        <div className="catalog-toolbar">
          <div className="catalog-toolbar-copy">
            <div className="catalog-section-icon"><BookOpen size={18} aria-hidden="true" /></div>
            <div><h2>All titles</h2><p>{total.toLocaleString("en-IN")} matching {total === 1 ? "title" : "titles"}</p></div>
          </div>
          <form className="catalog-filters" action="/admin/books" method="get">
            <label className="catalog-search">
              <Search size={16} aria-hidden="true" />
              <Input type="search" name="q" defaultValue={query} placeholder="Search title, ISBN or author…" aria-label="Search by title, ISBN or author" maxLength={120} />
            </label>
            <Select name="status" defaultValue={requestedStatus}>
              <SelectTrigger aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map(({ status }) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
            </Select>
            <Select name="genre" defaultValue={requestedGenre}>
              <SelectTrigger aria-label="Filter by genre"><SelectValue placeholder="All genres" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All genres</SelectItem>{genres.map(({ genre }) => <SelectItem key={genre} value={genre}>{genre}</SelectItem>)}</SelectContent>
            </Select>
            <input type="hidden" name="size" value={pageSize} />
            <button className="catalog-filter-submit" type="submit">Apply filters</button>
          </form>
        </div>

        {books.length ? <div className="catalog-table-scroll"><table className="catalog-data-table">
          <thead><tr><th>Title</th><th>Author</th><th>ISBN</th><th>Status</th><th className="numeric">Sold</th><th className="numeric">Earned</th><th className="numeric">Paid</th><th className="numeric">Pending</th><th>Last payout</th></tr></thead>
          <tbody>{books.map((book) => {
            const initials = book.author.user.name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BL";
            const live = book.status === "Published & Live";
            return <tr key={book.id}>
              <td className="catalog-title-cell"><strong>{book.title}</strong><span>{book.genre}</span></td>
              <td><div className="catalog-author-cell"><span className="catalog-author-avatar" aria-hidden="true">{initials}</span><span className="catalog-author-text"><strong>{book.author.user.name}</strong><small>{book.author.city || book.author.user.email}</small></span></div></td>
              <td className="catalog-isbn">{book.isbn}</td>
              <td><span className={`catalog-book-status ${live ? "is-live" : "is-progress"}`}><i aria-hidden="true" />{book.status}</span></td>
              <td className="numeric">{book.totalCopiesSold.toLocaleString("en-IN")}</td>
              <td className="numeric">{money(Number(book.totalRoyaltyEarned))}</td>
              <td className="numeric">{money(Number(book.royaltyPaid))}</td>
              <td className={`numeric ${Number(book.royaltyPending) ? "pending" : ""}`}>{money(Number(book.royaltyPending))}</td>
              <td>{date(book.lastRoyaltyPayoutDate)}</td>
            </tr>;
          })}</tbody>
        </table></div> : <div className="catalog-empty"><span><Search size={20} /></span><strong>No titles found</strong><p>Try changing your search or clearing one of the filters.</p><Link href="/admin/books">Clear filters</Link></div>}

        <div className="catalog-pagination">
          <p>Showing <strong>{from}–{to}</strong> of <strong>{total.toLocaleString("en-IN")}</strong> titles</p>
          <div className="catalog-pagination-controls">
            <Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={`catalog-page-button ${page <= 1 ? "is-disabled" : ""}`} href={catalogUrl({ ...retained, page: page - 1 })}><ArrowLeft size={15} />Previous</Link>
            <span>Page <strong>{page}</strong> of <strong>{pageCount}</strong></span>
            <Link aria-disabled={page >= pageCount} tabIndex={page >= pageCount ? -1 : undefined} className={`catalog-page-button ${page >= pageCount ? "is-disabled" : ""}`} href={catalogUrl({ ...retained, page: page + 1 })}>Next<ArrowRight size={15} /></Link>
          </div>
          <form action="/admin/books" method="get" className="catalog-page-size">
            {query && <input type="hidden" name="q" value={query} />}
            {requestedStatus !== "all" && <input type="hidden" name="status" value={requestedStatus} />}
            {requestedGenre !== "all" && <input type="hidden" name="genre" value={requestedGenre} />}
            <span>Rows per page</span>
            <Select name="size" defaultValue={String(pageSize)}>
              <SelectTrigger aria-label="Rows per page"><SelectValue /></SelectTrigger>
              <SelectContent>{PAGE_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
            </Select>
            <button type="submit" className="catalog-apply-size">Apply</button>
          </form>
        </div>
      </section>
    </>
  );
}

function Stat({ icon, label, value, note, accent = false }: { icon: ReactNode; label: string; value: string; note: string; accent?: boolean }) {
  return <article className="catalog-stat"><div className="catalog-stat-top"><span>{label}</span><span className="catalog-stat-icon">{icon}</span></div><strong className={accent ? "is-accent" : ""}>{value}</strong><small>{note}</small></article>;
}
