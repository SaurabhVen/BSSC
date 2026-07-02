CREATE TABLE IF NOT EXISTS "job_qualifications" (
	"sl_no" integer PRIMARY KEY NOT NULL,
	"qualification" text NOT NULL,
	"eligible_post_code" varchar(20) NOT NULL,
	"main_posts" text NOT NULL,
	"preference_applicable" varchar(3) NOT NULL CHECK ("preference_applicable" IN ('Yes', 'No'))
);
--> statement-breakpoint
ALTER TABLE "candidate_qualifications" ADD COLUMN "job_qualification_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_qualifications" ADD CONSTRAINT "candidate_qualifications_job_qualification_id_job_qualifications_sl_no_fk" FOREIGN KEY ("job_qualification_id") REFERENCES "public"."job_qualifications"("sl_no") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
