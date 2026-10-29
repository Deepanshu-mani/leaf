import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/server/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password || password.length > 256) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const limited = await rateLimit(request, "login", email, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, role: true, isActive: true, passwordHash: true } });
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return response;
}
