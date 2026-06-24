CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "tasks" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "comments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "attachments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "effort_logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "notifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
