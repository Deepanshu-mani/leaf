import { redirect } from "next/navigation";
import { AdminQueue } from "@/components/admin-queue";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/server/auth";
import { listTickets, ticketUpdatesVersion } from "@/server/serializers";

export default async function AdminQueuePage() {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) redirect("/dashboard");
  const [tickets, initialVersion] = await Promise.all([listTickets(user.id, true), ticketUpdatesVersion()]);
  return <AdminQueue initialTickets={tickets} initialVersion={initialVersion} adminId={user.id} />;
}
