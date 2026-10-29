import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { currentSession } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

async function requireSuperAdmin(request: Request) {
  const session = await currentSession();
  if (!session) return { response: NextResponse.json({ error: "Please sign in to continue." }, { status: 401 }) };
  if (session.user.role !== UserRole.ADMIN || !session.user.isSuperAdmin) {
    return { response: NextResponse.json({ error: "Super admin access required." }, { status: 403 }) };
  }
  const limited = await rateLimit(request, "team-user-management", session.user.id, { limit: 60, windowMs: 60 * 60 * 1000 });
  if (limited) return { response: limited };
  return { session };
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/users/[userId]">) {
  const access = await requireSuperAdmin(request);
  if ("response" in access) return access.response;
  let body: { isActive?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Choose whether to activate or deactivate this team member." }, { status: 400 }); }
  if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "Choose whether to activate or deactivate this team member." }, { status: 422 });

  const { userId } = await context.params;
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true, isSuperAdmin: true } });
  if (!target || target.role !== UserRole.ADMIN) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  if (target.id === access.session.user.id || target.isSuperAdmin) return NextResponse.json({ error: "You cannot change the super admin account." }, { status: 403 });
  if (target.isActive === body.isActive) return NextResponse.json({ ok: true, isActive: target.isActive });

  const changed = await prisma.user.updateMany({
    where: { id: target.id, role: UserRole.ADMIN, isSuperAdmin: false, isActive: target.isActive },
    data: { isActive: body.isActive },
  });
  if (changed.count !== 1) return NextResponse.json({ error: "This team member changed while you were updating the account. Refresh and try again." }, { status: 409 });
  if (!body.isActive) await prisma.authSession.deleteMany({ where: { userId: target.id } });
  return NextResponse.json({ ok: true, isActive: body.isActive });
}

export async function DELETE(request: Request, context: RouteContext<"/api/admin/users/[userId]">) {
  const access = await requireSuperAdmin(request);
  if ("response" in access) return access.response;
  const { userId } = await context.params;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true, isSuperAdmin: true, _count: { select: { sentMessages: true, internalNotes: true } } },
  });
  if (!target || target.role !== UserRole.ADMIN) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  if (target.id === access.session.user.id || target.isSuperAdmin) return NextResponse.json({ error: "The super admin account cannot be deleted." }, { status: 403 });
  if (target.isActive) return NextResponse.json({ error: "Deactivate this team member before permanently deleting the account." }, { status: 409 });
  if (target._count.sentMessages || target._count.internalNotes) {
    return NextResponse.json({ error: "This team member has sent replies or internal notes. Keep the account inactive to preserve their audit history." }, { status: 409 });
  }

  const deleted = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH target AS MATERIALIZED (
      SELECT id, name, email
      FROM users
      WHERE id = ${target.id} AND role = 'ADMIN' AND is_active = false AND is_super_admin = false
    ),
    preserve_activity AS (
      UPDATE ticket_activities AS activity
      SET actor_id = NULL,
          details = COALESCE(activity.details, '{}'::jsonb) || jsonb_build_object(
            'formerActorName', target.name,
            'formerActorEmail', target.email
          )
      FROM target
      WHERE activity.actor_id = target.id
      RETURNING activity.id
    ),
    release_assignments AS (
      UPDATE tickets AS ticket
      SET assigned_to_id = NULL
      FROM target
      WHERE ticket.assigned_to_id = target.id
      RETURNING ticket.id
    )
    DELETE FROM users AS member
    USING target
    WHERE member.id = target.id
    RETURNING member.id
  `;
  if (!deleted.length) return NextResponse.json({ error: "This team member changed while you were deleting the account. Refresh and try again." }, { status: 409 });
  return NextResponse.json({ ok: true, emailAvailableForNewInvite: true });
}
