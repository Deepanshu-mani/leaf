import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { currentSession } from "@/server/auth";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (session.user.role !== UserRole.ADMIN) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const limited = await rateLimit(request, "invite-create", session.user.id, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  let body: { name?: unknown; email?: unknown; role?: unknown; city?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid invitation details." }, { status: 400 }); }
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = body.role === UserRole.ADMIN ? UserRole.ADMIN : body.role === UserRole.AUTHOR ? UserRole.AUTHOR : null;
  const city = String(body.city ?? "").trim().slice(0, 100) || null;
  if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !role) {
    return NextResponse.json({ error: "Enter a name, valid email, and account type." }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  const activeInvite = await prisma.userInvite.findFirst({ where: { email, acceptedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
  if (activeInvite) return NextResponse.json({ error: "An active invitation already exists for this email." }, { status: 409 });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.userInvite.create({ data: { tokenHash: hashToken(token), email, name, role, city, invitedById: session.user.id, expiresAt } });
  const inviteUrl = new URL(`/invite/${token}`, getSiteUrl(request.url)).toString();
  return NextResponse.json({ inviteUrl, expiresAt: expiresAt.toISOString() }, { status: 201 });
}
