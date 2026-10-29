import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "bookleaf_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.authSession.create({
    data: { tokenHash: hashSessionToken(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { select: {
      id: true, email: true, name: true, role: true, isActive: true, isSuperAdmin: true, createdAt: true,
      updatedAt: true, profileImageType: true, author: true,
    } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null;
  return { ...session, user: session.user };
}

export async function requireUser(role?: UserRole) {
  const session = await currentSession();
  if (!session) redirect("/login");
  if (role && session.user.role !== role) {
    redirect(session.user.role === UserRole.ADMIN ? "/admin/queue" : "/dashboard");
  }
  return session.user;
}
