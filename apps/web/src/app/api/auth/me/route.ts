import { NextResponse } from "next/server";
import { currentSession } from "@/server/auth";

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  const { id, name, email, role } = session.user;
  return NextResponse.json({ user: { id, name, email, role } });
}
