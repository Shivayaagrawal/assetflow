-- Better Auth expects updatedAt on Verification for password reset tokens.
ALTER TABLE "Verification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
