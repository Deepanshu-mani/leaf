CREATE TABLE "rate_limit_buckets" (
    "bucket_key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("bucket_key"),
    CONSTRAINT "rate_limit_buckets_count_check" CHECK ("count" >= 0)
);

CREATE INDEX "rate_limit_buckets_reset_at_idx" ON "rate_limit_buckets"("reset_at");
