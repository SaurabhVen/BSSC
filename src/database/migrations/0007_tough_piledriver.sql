CREATE TABLE IF NOT EXISTS "degrees" (
	"degree_id" serial PRIMARY KEY NOT NULL,
	"degree_name" varchar(100) NOT NULL,
	CONSTRAINT "degrees_degree_name_unique" UNIQUE("degree_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_eligibility" (
	"id" serial PRIMARY KEY NOT NULL,
	"degree_id" integer,
	"subject_id" integer,
	"post_code" varchar(10),
	"is_honours" boolean DEFAULT false,
	"has_math_subsidiary" boolean DEFAULT false,
	"preference_applicable" varchar(3) DEFAULT 'No' NOT NULL,
	"specialization_notes" text
);
--> statement-breakpoint
DROP TABLE "post_categories";--> statement-breakpoint
DROP TABLE "post_educations";--> statement-breakpoint
DROP TABLE "post_subjects";--> statement-breakpoint
DROP TABLE "post_vacancys";--> statement-breakpoint
DROP TABLE "vacancys";--> statement-breakpoint
ALTER TABLE "candidate_post_preferences" DROP CONSTRAINT "candidate_post_preferences_post_id_posts_post_id_fk";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_cat_id_categories_cat_id_fk";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_edu_id_educations_edu_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "posts_post_slug_idx";--> statement-breakpoint
ALTER TABLE "candidate_post_preferences" ADD COLUMN "post_code" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_pkey" CASCADE;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "post_code" varchar(10) PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "post_name" varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "subjects_pkey" CASCADE;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "subject_id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "subject_name" varchar(150) NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_eligibility" ADD CONSTRAINT "job_eligibility_degree_id_degrees_degree_id_fk" FOREIGN KEY ("degree_id") REFERENCES "public"."degrees"("degree_id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_eligibility" ADD CONSTRAINT "job_eligibility_subject_id_subjects_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("subject_id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_eligibility" ADD CONSTRAINT "job_eligibility_post_code_posts_post_code_fk" FOREIGN KEY ("post_code") REFERENCES "public"."posts"("post_code") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_post_preferences" ADD CONSTRAINT "candidate_post_preferences_post_code_posts_post_code_fk" FOREIGN KEY ("post_code") REFERENCES "public"."posts"("post_code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "candidate_post_preferences" DROP COLUMN IF EXISTS "post_id";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "post_id";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "post_user_id";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "cat_id";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "edu_id";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "post_title";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "post_slug";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "post_content";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "post_publish";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "created_at";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "updated_at";--> statement-breakpoint
ALTER TABLE "subjects" DROP COLUMN IF EXISTS "sub_id";--> statement-breakpoint
ALTER TABLE "subjects" DROP COLUMN IF EXISTS "sub_user_id";--> statement-breakpoint
ALTER TABLE "subjects" DROP COLUMN IF EXISTS "sub_name";--> statement-breakpoint
ALTER TABLE "subjects" DROP COLUMN IF EXISTS "sub_publish";--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_subject_name_unique" UNIQUE("subject_name");