ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cognito_sub_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_cognito_sub_idx" ON "users" ("cognito_sub_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_cognito_sub_id_unique" UNIQUE("cognito_sub_id");