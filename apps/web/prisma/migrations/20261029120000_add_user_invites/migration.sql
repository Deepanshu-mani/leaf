CREATE TABLE "user_invites" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AUTHOR',
    "city" TEXT,
    "invited_by_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_invites_token_hash_key" ON "user_invites"("token_hash");
CREATE INDEX "user_invites_email_accepted_at_expires_at_idx" ON "user_invites"("email", "accepted_at", "expires_at");
CREATE INDEX "user_invites_invited_by_id_created_at_idx" ON "user_invites"("invited_by_id", "created_at");
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
