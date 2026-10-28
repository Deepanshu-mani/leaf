import { redirect } from "next/navigation";
import { AdminQueue } from "@/components/admin-queue";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/server/auth";
import { listTickets } from "@/server/serializers";

export default async function AdminQueuePage() {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) redirect("/dashboard");
  const tickets = await listTickets(user.id, true);
  return <AdminQueue initialTickets={tickets} adminId={user.id} />;
}
