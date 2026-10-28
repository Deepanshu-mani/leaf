import { NextResponse } from "next/server";
import {
  ClassificationSource,
  TicketActivityType,
  UserRole,
} from "@/generated/prisma/enums";
import { currentSession } from "@/server/auth";
import { listTickets } from "@/server/serializers";
import { parseCategory, parsePriority, parseStatus } from "@/server/tickets";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: RouteContext<"/api/tickets/[ticketId]">) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  const { ticketId } = await context.params;
  const ticket = (await listTickets(session.user.id, session.user.role === UserRole.ADMIN)).find((item) => item.id === ticketId);
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function PATCH(request: Request, context: RouteContext<"/api/tickets/[ticketId]">) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (session.user.role !== UserRole.ADMIN) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { ticketId } = await context.params;
  let body: { status?: unknown; category?: unknown; priority?: unknown; assignedToId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid update." }, { status: 400 }); }
  const before = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!before) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  const data: Record<string, unknown> = {};
  const activities: Array<{ actorId: string; type: TicketActivityType; details: object }> = [];

  if (body.status !== undefined) {
    const status = parseStatus(body.status);
    if (!status) return NextResponse.json({ error: "Choose a valid status." }, { status: 422 });
    if (status !== before.status) activities.push({ actorId: session.user.id, type: TicketActivityType.STATUS_CHANGED, details: { from: before.status, to: status } });
    data.status = status;
  }
  if (body.category !== undefined) {
    const category = parseCategory(body.category);
    if (!category) return NextResponse.json({ error: "Choose a valid category." }, { status: 422 });
    if (category !== before.category) activities.push({ actorId: session.user.id, type: TicketActivityType.CATEGORY_CHANGED, details: { from: before.category, to: category } });
    data.category = category;
    data.categorySource = ClassificationSource.ADMIN;
  }
  if (body.priority !== undefined) {
    const priority = parsePriority(body.priority);
    if (!priority) return NextResponse.json({ error: "Choose a valid priority." }, { status: 422 });
    if (priority !== before.priority) activities.push({ actorId: session.user.id, type: TicketActivityType.PRIORITY_CHANGED, details: { from: before.priority, to: priority } });
    data.priority = priority;
    data.prioritySource = ClassificationSource.ADMIN;
  }
  if (body.assignedToId !== undefined) {
    const assignedToId = body.assignedToId ? String(body.assignedToId) : null;
    if (assignedToId && assignedToId !== session.user.id) return NextResponse.json({ error: "You can assign tickets to yourself." }, { status: 422 });
    if (assignedToId && assignedToId !== before.assignedToId) activities.push({ actorId: session.user.id, type: TicketActivityType.ASSIGNED, details: { assignedToId } });
    if (!assignedToId && before.assignedToId) activities.push({ actorId: session.user.id, type: TicketActivityType.UNASSIGNED, details: {} });
    data.assignedToId = assignedToId;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.ticket.update({ where: { id: ticketId }, data });
    if (activities.length) await tx.ticketActivity.createMany({ data: activities.map((activity) => ({ ...activity, ticketId })) });
    return row;
  });
  return NextResponse.json({ ticket: { id: updated.id, status: updated.status, category: updated.category, priority: updated.priority, assignedToId: updated.assignedToId } });
}
