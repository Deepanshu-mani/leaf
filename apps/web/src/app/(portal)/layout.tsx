import { PortalShell } from "@/components/portal-shell";
import { requireUser } from "@/server/auth";
import { connection } from "next/server";

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  await connection();
  const user = await requireUser();
  return <PortalShell user={{ id: user.id, name: user.name, email: user.email, role: user.role, updatedAt: user.updatedAt, profileImageType: user.profileImageType }}>{children}</PortalShell>;
}
