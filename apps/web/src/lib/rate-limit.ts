import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RateLimit = { limit: number; windowMs: number };

/**
 * Database-backed fixed-window limit shared across app instances. The key is
 * hashed so raw IP addresses and account identifiers are not persisted.
 */
export async function rateLimit(request: Request, scope: string, identity: string, config: RateLimit) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const bucketKeys = [hash(`${scope}\0ip\0${ip}`), hash(`${scope}\0identity\0${identity}`)];
  const resetAt = new Date(Date.now() + config.windowMs);
  const buckets = await Promise.all(bucketKeys.map(async (bucketKey) => {
    const rows = await prisma.$queryRaw<Array<{ count: number; reset_at: Date }>>`
      INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
      VALUES (${bucketKey}, 1, ${resetAt})
      ON CONFLICT (bucket_key) DO UPDATE SET
        count = CASE WHEN rate_limit_buckets.reset_at <= NOW() THEN 1 ELSE rate_limit_buckets.count + 1 END,
        reset_at = CASE WHEN rate_limit_buckets.reset_at <= NOW() THEN EXCLUDED.reset_at ELSE rate_limit_buckets.reset_at END
      RETURNING count, reset_at
    `;
    return rows[0];
  }));

  // Remove abandoned identifiers occasionally without adding work to every request.
  if (Math.random() < 0.01) {
    await prisma.$executeRaw`DELETE FROM rate_limit_buckets WHERE reset_at < NOW() - INTERVAL '1 day'`;
  }

  const exceeded = buckets.filter((bucket) => bucket.count > config.limit);
  if (!exceeded.length) return null;
  const retryAfter = Math.max(...exceeded.map((bucket) => Math.ceil((bucket.reset_at.getTime() - Date.now()) / 1000)), 1);
  return NextResponse.json(
    { error: "Too many requests. Please wait a little and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
