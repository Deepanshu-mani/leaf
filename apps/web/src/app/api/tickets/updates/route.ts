import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { currentSession } from "@/server/auth";
import { ticketUpdatesVersion } from "@/server/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (session.user.role === UserRole.AUTHOR && !session.user.author) {
    return NextResponse.json({ error: "Author profile not found." }, { status: 403 });
  }
  const version = await ticketUpdatesVersion(session.user.role === UserRole.ADMIN ? undefined : session.user.author!.id);
  return NextResponse.json({ version }, { headers: { "Cache-Control": "no-store" } });
}
