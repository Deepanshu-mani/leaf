import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { currentSession } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isValidImage(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

async function canAccess(userId: string) {
  const session = await currentSession();
  if (!session) return { response: NextResponse.json({ error: "Please sign in to continue." }, { status: 401 }) };
  if (session.user.id !== userId && session.user.role !== UserRole.ADMIN) {
    return { response: NextResponse.json({ error: "You cannot access this profile image." }, { status: 403 }) };
  }
  return { session };
}

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const access = await canAccess(userId);
  if ("response" in access) return access.response;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { profileImage: true, profileImageType: true } });
  if (!user?.profileImage || !user.profileImageType) return NextResponse.json({ error: "No profile image has been uploaded." }, { status: 404 });
  return new NextResponse(new Uint8Array(user.profileImage), {
    headers: {
      "Content-Type": user.profileImageType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const access = await canAccess(userId);
  if ("response" in access) return access.response;
  if (access.session.user.id !== userId) return NextResponse.json({ error: "You can only update your own profile image." }, { status: 403 });
  const limited = await rateLimit(request, "avatar-upload", userId, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_BYTES + 64 * 1024) return NextResponse.json({ error: "Images must be under 2 MB." }, { status: 413 });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 }); }
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  if (!IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 415 });
  if (!file.size || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Images must be under 2 MB." }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isValidImage(bytes, file.type)) return NextResponse.json({ error: "The selected file is not a valid image." }, { status: 415 });

  await prisma.user.update({ where: { id: userId }, data: { profileImage: bytes, profileImageType: file.type } });
  return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const access = await canAccess(userId);
  if ("response" in access) return access.response;
  if (access.session.user.id !== userId) return NextResponse.json({ error: "You can only update your own profile image." }, { status: 403 });
  await prisma.user.update({ where: { id: userId }, data: { profileImage: null, profileImageType: null } });
  return NextResponse.json({ ok: true });
}
