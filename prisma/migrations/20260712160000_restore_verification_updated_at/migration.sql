-- Better Auth expects updatedAt on Verification for password reset tokens.
-- schema_lock_lean dropped this column; restore it to match prisma/schema.prisma.
ALTER TABLE "Verification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
