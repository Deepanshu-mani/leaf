import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { currentSession } from "@/server/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  const authors = await prisma.author.findMany({
    where: session.user.role === UserRole.ADMIN ? undefined : { userId: session.user.id },
    include: { user: { select: { id: true, name: true, email: true } }, books: { include: { availability: true }, orderBy: { title: "asc" } } },
    orderBy: { user: { name: "asc" } },
  });
  return NextResponse.json({ authors: authors.map((author) => ({
    id: author.id,
    name: author.user.name,
    email: author.user.email,
    city: author.city,
    books: author.books.map((book) => ({
      id: book.id,
      authorId: author.id,
      title: book.title,
      isbn: book.isbn,
      genre: book.genre,
      status: book.status,
      publicationDate: book.publicationDate?.toISOString() ?? null,
      mrp: book.mrp === null ? null : Number(book.mrp),
      authorRoyaltyPerCopy: book.authorRoyaltyPerCopy === null ? null : Number(book.authorRoyaltyPerCopy),
      totalCopiesSold: book.totalCopiesSold,
      totalRoyaltyEarned: Number(book.totalRoyaltyEarned),
      royaltyPaid: Number(book.royaltyPaid),
      royaltyPending: Number(book.royaltyPending),
      lastRoyaltyPayoutDate: book.lastRoyaltyPayoutDate?.toISOString() ?? null,
      printPartner: book.printPartner,
      availability: book.availability.map((item) => item.channel),
    })),
  })) });
}
