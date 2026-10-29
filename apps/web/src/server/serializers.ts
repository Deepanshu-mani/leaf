import "server-only";

import { prisma } from "@/lib/prisma";
import { categoryLabels, priorityLabels, statusLabels } from "@/server/tickets";

export async function listTickets(userId: string, isAdmin: boolean) {
  const tickets = await prisma.ticket.findMany({
    where: isAdmin ? undefined : { authorId: userId },
    include: {
      author: { include: { user: { select: { id: true, name: true, email: true } } } },
      book: true,
      assignedTo: { select: { id: true, name: true } },
      messages: { include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      notes: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "asc" }],
  });
  return tickets.map((ticket) => ({
    id: ticket.id,
    authorId: ticket.authorId,
    authorName: ticket.author.user.name,
    authorEmail: ticket.author.user.email,
    authorCity: ticket.author.city,
    bookId: ticket.bookId,
    bookTitle: ticket.book?.title ?? null,
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    categoryLabel: categoryLabels[ticket.category],
    priority: ticket.priority,
    priorityLabel: priorityLabels[ticket.priority],
    status: ticket.status,
    statusLabel: statusLabels[ticket.status],
    categorySource: ticket.categorySource,
    prioritySource: ticket.prioritySource,
    aiCategory: ticket.aiCategory,
    aiPriority: ticket.aiPriority,
    aiReason: ticket.aiReason,
    aiModel: ticket.aiModel,
    aiClassifiedAt: ticket.aiClassifiedAt?.toISOString() ?? null,
    assignedToId: ticket.assignedToId,
    assignedToName: ticket.assignedTo?.name ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: ticket.messages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      senderId: message.senderId,
      senderName: message.sender.name,
    })),
    notes: isAdmin ? ticket.notes.map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      authorName: note.author.name,
    })) : [],
  }));
}

export async function ticketUpdatesVersion(authorId?: string) {
  const latest = await prisma.ticketActivity.findFirst({
    where: authorId ? { ticket: { authorId } } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, createdAt: true },
  });
  return latest ? `${latest.createdAt.getTime()}-${latest.id}` : "empty";
}
