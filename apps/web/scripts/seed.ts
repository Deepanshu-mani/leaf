import "dotenv/config";
import {
  ClassificationSource,
  DistributionChannel,
  TicketActivityType,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "../src/generated/prisma/enums";
import sampleData from "../prisma/seed-data/bookleaf_sample_data.json";
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";

type SampleData = {
  authors: Array<{
    author_id: string; name: string; email: string; phone?: string; city?: string; joined_date?: string;
    books: Array<{
      book_id: string; title: string; isbn: string; genre: string; publication_date?: string | null; status: string;
      mrp?: number | null; author_royalty_per_copy?: number | null; total_copies_sold?: number;
      total_royalty_earned?: number; royalty_paid?: number; royalty_pending?: number;
      last_royalty_payout_date?: string | null; print_partner?: string | null; available_on?: string[];
    }>;
  }>;
};
const sample = sampleData as SampleData;
const categoryByLabel: Record<string, TicketCategory> = {
  "Royalty & Payments": TicketCategory.ROYALTY_PAYMENTS,
  "ISBN & Metadata Issues": TicketCategory.ISBN_METADATA,
  "Printing & Quality": TicketCategory.PRINTING_QUALITY,
  "Distribution & Availability": TicketCategory.DISTRIBUTION,
  "Book Status & Production Updates": TicketCategory.PRODUCTION_STATUS,
  "General Inquiry": TicketCategory.GENERAL_INQUIRY,
};
const priorityByLabel: Record<string, TicketPriority> = { Critical: TicketPriority.CRITICAL, High: TicketPriority.HIGH, Medium: TicketPriority.MEDIUM, Low: TicketPriority.LOW };
const statusByLabel: Record<string, TicketStatus> = { Open: TicketStatus.OPEN, "In Progress": TicketStatus.IN_PROGRESS, Resolved: TicketStatus.RESOLVED, Closed: TicketStatus.CLOSED };
const channelByLabel: Record<string, DistributionChannel> = {
  "Amazon India": DistributionChannel.AMAZON_INDIA, Flipkart: DistributionChannel.FLIPKART,
  "Amazon US": DistributionChannel.AMAZON_US, "Amazon UK": DistributionChannel.AMAZON_UK,
  "BookLeaf Store": DistributionChannel.BOOKLEAF_STORE,
};
const asDate = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : null;

async function main() {
  const authorPassword = process.env.DEMO_AUTHOR_PASSWORD || "bookleaf123";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "admin123";
  const adminId = "ADMIN";
  const authorHash = hashPassword(authorPassword);
  const now = new Date();
  const books = sample.authors.flatMap((author) => author.books.map((book) => ({
    id: book.book_id,
    authorId: author.author_id,
    title: book.title,
    isbn: book.isbn,
    genre: book.genre,
    publicationDate: asDate(book.publication_date),
    status: book.status,
    mrp: book.mrp ?? null,
    authorRoyaltyPerCopy: book.author_royalty_per_copy ?? null,
    totalCopiesSold: book.total_copies_sold ?? 0,
    totalRoyaltyEarned: book.total_royalty_earned ?? 0,
    royaltyPaid: book.royalty_paid ?? 0,
    royaltyPending: book.royalty_pending ?? 0,
    lastRoyaltyPayoutDate: asDate(book.last_royalty_payout_date),
    printPartner: book.print_partner ?? null,
    createdAt: now,
    updatedAt: now,
  })));
  const availability = sample.authors.flatMap((author) => author.books.flatMap((book) => (book.available_on ?? [])
    .filter((channel) => channelByLabel[channel])
    .map((channel) => ({ bookId: book.book_id, channel: channelByLabel[channel] }))));

  const tickets = [
    { id: "TKT-1048", authorId: "AUTH003", bookId: "BK005", subject: "Royalty payout for my first sales", description: "I can see sales in my dashboard but have not received a payout yet. Could you explain when it will be paid?", category: "Royalty & Payments", priority: "High", status: "Open", createdAt: new Date("2026-10-27T11:36:20.717Z") },
    { id: "TKT-1047", authorId: "AUTH007", bookId: "BK013", subject: "Production timeline for Midnight in Mysore", description: "My book has been in cover design for a while. Can you share the next step and expected timeline?", category: "Book Status & Production Updates", priority: "Medium", status: "In Progress", assignedToId: adminId, createdAt: new Date("2026-10-26T11:36:20.717Z") },
    { id: "TKT-1046", authorId: "AUTH002", bookId: "BK004", subject: "Amazon listing is currently unavailable", description: "My book is showing as currently unavailable on Amazon India, though it was live last week.", category: "Distribution & Availability", priority: "High", status: "Open", createdAt: new Date("2026-10-28T09:36:20.717Z") },
    { id: "TKT-1045", authorId: "AUTH005", bookId: "BK009", subject: "Update my author bio", description: "I would like to make a small change to my author bio on the book listings.", category: "General Inquiry", priority: "Low", status: "Resolved", assignedToId: adminId, createdAt: new Date("2026-10-24T21:36:20.717Z") },
  ].map((ticket) => ({
    ...ticket,
    category: categoryByLabel[ticket.category],
    priority: priorityByLabel[ticket.priority],
    status: statusByLabel[ticket.status],
    categorySource: ClassificationSource.RULES,
    prioritySource: ClassificationSource.RULES,
    updatedAt: now,
  }));

  await prisma.user.createMany({
    data: [
      { id: adminId, email: "admin@bookleaf.com", name: "Maya Chen", passwordHash: hashPassword(adminPassword), role: UserRole.ADMIN, createdAt: now, updatedAt: now },
      ...sample.authors.map((author) => ({ id: author.author_id, email: author.email.toLowerCase(), name: author.name, passwordHash: authorHash, role: UserRole.AUTHOR, createdAt: now, updatedAt: now })),
    ],
    skipDuplicates: true,
  });
  await prisma.author.createMany({
    data: sample.authors.map((author) => ({ id: author.author_id, userId: author.author_id, phone: author.phone ?? null, city: author.city ?? null, joinedDate: asDate(author.joined_date) })),
    skipDuplicates: true,
  });
  await prisma.book.createMany({ data: books, skipDuplicates: true });
  await prisma.bookAvailability.createMany({ data: availability, skipDuplicates: true });
  await prisma.ticket.createMany({ data: tickets, skipDuplicates: true });
  await prisma.ticketNote.createMany({
    data: [{ id: "NOTE-1047-1", ticketId: "TKT-1047", authorId: adminId, body: "Checking whether cover approval is pending.", createdAt: new Date("2026-10-27T21:36:20.717Z") }],
    skipDuplicates: true,
  });
  await prisma.ticketMessage.createMany({
    data: [{ id: "MSG-1045-1", ticketId: "TKT-1045", senderId: adminId, body: "Thanks for reaching out. Please send the revised bio through your dashboard and our team will submit it to the listing platforms. Changes typically appear within 3–5 business days. Next step: reply here with the updated copy and we’ll take it from there.", createdAt: new Date("2026-10-27T23:36:20.717Z") }],
    skipDuplicates: true,
  });
  await prisma.ticketActivity.createMany({
    data: tickets.map((ticket) => ({ id: `ACT-${ticket.id}`, ticketId: ticket.id, actorId: adminId, type: TicketActivityType.CREATED, details: { seeded: true } })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${sample.authors.length} authors, ${books.length} books, ${tickets.length} support tickets.`);
  console.log("Demo sign-in: any supplied author email / DEMO_AUTHOR_PASSWORD (default bookleaf123); admin@bookleaf.com / DEMO_ADMIN_PASSWORD (default admin123).");
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
