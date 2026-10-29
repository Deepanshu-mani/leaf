import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { currentSession } from "@/server/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function DELETE(request: Request, { params }: RouteContext<"/api/admin/invites/[inviteId]">) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (session.user.role !== UserRole.ADMIN) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const limited = await rateLimit(request, "invite-revoke", session.user.id, { limit: 40, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;
  const { inviteId } = await params;
  const result = await prisma.userInvite.deleteMany({ where: { id: inviteId, acceptedAt: null } });
  if (!result.count) return NextResponse.json({ error: "This pending invitation no longer exists." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
