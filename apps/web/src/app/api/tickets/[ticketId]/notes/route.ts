import { NextResponse } from "next/server";
import { TicketActivityType, UserRole } from "@/generated/prisma/enums";
import { currentSession } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request, context: RouteContext<"/api/tickets/[ticketId]/notes">) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (session.user.role !== UserRole.ADMIN) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const limited = await rateLimit(request, "ticket-note", session.user.id, { limit: 120, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;
  const { ticketId } = await context.params;
  let body: { text?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid note." }, { status: 400 }); }
  const text = String(body.text ?? "").trim();
  if (!text || text.length > 2000) return NextResponse.json({ error: "Note must be between 1 and 2,000 characters." }, { status: 422 });
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  await prisma.$transaction([
    prisma.ticketNote.create({ data: { ticketId, authorId: session.user.id, body: text } }),
    prisma.ticketActivity.create({ data: { ticketId, actorId: session.user.id, type: TicketActivityType.INTERNAL_NOTE_ADDED } }),
  ]);
  return NextResponse.json({ ok: true }, { status: 201 });
}
