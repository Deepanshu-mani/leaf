import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { currentSession } from "@/server/auth";
import { connection } from "next/server";

export default async function HomePage() {
  await connection();
  const session = await currentSession();
  if (!session) redirect("/login");
  redirect(session.user.role === UserRole.ADMIN ? "/admin/queue" : "/dashboard");
}
