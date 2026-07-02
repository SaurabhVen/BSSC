CREATE TABLE IF NOT EXISTS "final_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_cognito_sub_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "users_cognito_sub_idx";--> statement-breakpoint
ALTER TABLE "candidate_qualifications" ADD COLUMN "passing_year" varchar(20);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "pay_json" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "final_submissions" ADD CONSTRAINT "final_submissions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "final_submissions" ADD CONSTRAINT "final_submissions_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "cognito_sub_id";