import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { currentSession } from "@/server/auth";
import { draftWithGemini } from "@/server/gemini";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, context: RouteContext<"/api/tickets/[ticketId]/draft">) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (session.user.role !== UserRole.ADMIN) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { ticketId } = await context.params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { author: { include: { user: true } }, book: true },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  const result = await draftWithGemini({
    authorName: ticket.author.user.name,
    bookTitle: ticket.book?.title ?? null,
    bookStatus: ticket.book?.status,
    pendingRoyalty: ticket.book ? Number(ticket.book.royaltyPending) : null,
    category: ticket.category,
    subject: ticket.subject,
    description: ticket.description,
  });
  return NextResponse.json(result);
}
