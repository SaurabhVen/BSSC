ALTER TABLE "educations" ADD COLUMN "application_id" uuid;--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "level" varchar(50);--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "degree" varchar(100);--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "board_university" varchar(255);--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "total_marks" integer;--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "marks_obtained" integer;--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "specialization" varchar(100);--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "passing_year" varchar(20);--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "job_qualification_id" integer;--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "educations" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "educations" ADD CONSTRAINT "educations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "educations" ADD CONSTRAINT "educations_job_qualification_id_job_qualifications_sl_no_fk" FOREIGN KEY ("job_qualification_id") REFERENCES "public"."job_qualifications"("sl_no") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
