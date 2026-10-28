import { NextResponse } from "next/server";
import { TicketActivityType, TicketStatus, UserRole } from "@/generated/prisma/enums";
import { currentSession } from "@/server/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: RouteContext<"/api/tickets/[ticketId]/messages">) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (session.user.role !== UserRole.ADMIN) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { ticketId } = await context.params;
  let body: { text?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid response." }, { status: 400 }); }
  const text = String(body.text ?? "").trim();
  if (text.length < 2 || text.length > 5000) return NextResponse.json({ error: "Response must be between 2 and 5,000 characters." }, { status: 422 });
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  await prisma.$transaction([
    prisma.ticketMessage.create({ data: { ticketId, senderId: session.user.id, body: text } }),
    prisma.ticket.update({ where: { id: ticketId }, data: { status: TicketStatus.RESOLVED } }),
    prisma.ticketActivity.create({ data: { ticketId, actorId: session.user.id, type: TicketActivityType.REPLY_SENT } }),
  ]);
  return NextResponse.json({ ok: true }, { status: 201 });
}
