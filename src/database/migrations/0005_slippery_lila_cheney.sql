CREATE TABLE IF NOT EXISTS "candidate_experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"designation" varchar(100),
	"organization" varchar(255),
	"date_of_joining" timestamp,
	"relieving_date" timestamp,
	"duration_years" integer,
	"duration_months" integer,
	"experience_letter_no" varchar(100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "candidate_languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"paper_one_language" varchar(100),
	"paper_two_language" varchar(100),
	"paper_three_language" varchar(100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "candidate_post_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"post_id" bigint NOT NULL,
	"priority" integer NOT NULL,
	"is_regular" boolean DEFAULT true,
	"is_backlog" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "candidate_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"level" varchar(50) NOT NULL,
	"degree" varchar(100),
	"board_university" varchar(255),
	"institution_name" varchar(255),
	"year_of_passing" integer,
	"total_marks" integer,
	"marks_obtained" integer,
	"percentage" numeric(5, 2),
	"roll_number" varchar(50),
	"grade" varchar(50),
	"specialization" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "alternate_number" varchar(15);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_experiences" ADD CONSTRAINT "candidate_experiences_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_languages" ADD CONSTRAINT "candidate_languages_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_post_preferences" ADD CONSTRAINT "candidate_post_preferences_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_post_preferences" ADD CONSTRAINT "candidate_post_preferences_post_id_posts_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_qualifications" ADD CONSTRAINT "candidate_qualifications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
