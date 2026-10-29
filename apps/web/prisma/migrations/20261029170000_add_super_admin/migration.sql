ALTER TABLE "users" ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users"
SET "is_super_admin" = true
WHERE "email" = 'admin@bookleaf.com' AND "role" = 'ADMIN';

CREATE UNIQUE INDEX "users_single_super_admin_idx"
ON "users" ("is_super_admin")
WHERE "is_super_admin" = true;
