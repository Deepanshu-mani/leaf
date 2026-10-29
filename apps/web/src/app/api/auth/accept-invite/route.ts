import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE } from "@/server/auth";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "This invitation link is invalid." }, { status: 400 }); }
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "This invitation link is invalid." }, { status: 400 });
  if (password.length < 12 || password.length > 128) return NextResponse.json({ error: "Use a password between 12 and 128 characters." }, { status: 400 });

  const now = new Date();
  let user: { id: string; name: string; email: string; role: UserRole };
  try {
    user = await prisma.$transaction(async (tx) => {
      const invite = await tx.userInvite.findUnique({ where: { tokenHash: hashToken(token) } });
      if (!invite || invite.acceptedAt || invite.expiresAt <= now) throw new Error("INVITE_INVALID");
      const claimed = await tx.userInvite.updateMany({ where: { id: invite.id, acceptedAt: null, expiresAt: { gt: now } }, data: { acceptedAt: now } });
      if (claimed.count !== 1) throw new Error("INVITE_INVALID");
      const account = await tx.user.create({
        data: {
          name: invite.name,
          email: invite.email,
          role: invite.role,
          passwordHash: hashPassword(password),
          ...(invite.role === UserRole.AUTHOR ? { author: { create: { id: randomUUID(), city: invite.city, joinedDate: now } } } : {}),
        },
        select: { id: true, name: true, email: true, role: true },
      });
      return account;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_INVALID") return NextResponse.json({ error: "This invitation is expired or has already been used." }, { status: 410 });
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "An account already exists for this email. Ask an admin for help." }, { status: 409 });
    console.error("Invite acceptance failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We couldn’t activate this account. Please try again." }, { status: 500 });
  }

  const { token: sessionToken, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ user: { id: user.id, role: user.role } });
  response.cookies.set(SESSION_COOKIE, sessionToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
  return response;
}
