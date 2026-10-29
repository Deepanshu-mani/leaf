import { NextResponse } from "next/server";
import {
  ClassificationSource,
  TicketActivityType,
  TicketStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { currentSession } from "@/server/auth";
import { classifyWithGemini } from "@/server/gemini";
import { listTickets } from "@/server/serializers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  return NextResponse.json({ tickets: await listTickets(session.user.id, session.user.role === UserRole.ADMIN) });
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (session.user.role !== UserRole.AUTHOR || !session.user.author) {
    return NextResponse.json({ error: "Only authors can open support tickets." }, { status: 403 });
  }
  const limited = await rateLimit(request, "ticket-create", session.user.id, { limit: 8, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;
  let body: { subject?: unknown; description?: unknown; bookId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid ticket details." }, { status: 400 }); }
  const subject = String(body.subject ?? "").trim();
  const description = String(body.description ?? "").trim();
  const bookId = body.bookId ? String(body.bookId) : null;
  if (subject.length < 4 || subject.length > 120) return NextResponse.json({ error: "Subject must be between 4 and 120 characters." }, { status: 422 });
  if (description.length < 12 || description.length > 4000) return NextResponse.json({ error: "Description must be between 12 and 4,000 characters." }, { status: 422 });
  if (bookId) {
    const book = await prisma.book.findFirst({ where: { id: bookId, authorId: session.user.author.id }, select: { id: true } });
    if (!book) return NextResponse.json({ error: "Choose one of your own books." }, { status: 422 });
  }

  const classification = await classifyWithGemini(subject, description);
  const now = new Date();
  const ticket = await prisma.ticket.create({
    data: {
      id: `TKT-${now.getTime()}`,
      authorId: session.user.author.id,
      bookId,
      subject,
      description,
      category: classification.category,
      priority: classification.priority,
      status: TicketStatus.OPEN,
      categorySource: classification.source === "GEMINI" ? ClassificationSource.GEMINI : ClassificationSource.RULES,
      prioritySource: classification.source === "GEMINI" ? ClassificationSource.GEMINI : ClassificationSource.RULES,
      aiCategory: classification.source === "GEMINI" ? classification.category : null,
      aiPriority: classification.source === "GEMINI" ? classification.priority : null,
      aiReason: classification.reason,
      aiModel: classification.source === "GEMINI" ? process.env.GEMINI_MODEL || "gemini-2.5-flash" : null,
      aiClassifiedAt: classification.source === "GEMINI" ? now : null,
      activities: { create: { actorId: session.user.id, type: TicketActivityType.CREATED, details: { source: classification.source } } },
    },
  });
  return NextResponse.json({ ticket: { id: ticket.id, category: ticket.category, priority: ticket.priority, status: ticket.status } }, { status: 201 });
}
