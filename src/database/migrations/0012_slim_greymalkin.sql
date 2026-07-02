CREATE TABLE IF NOT EXISTS "post_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_code" varchar(10),
	"degree_id" integer
);
--> statement-breakpoint
DROP TABLE "candidate_experiences";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "full_name" varchar(200);--> statement-breakpoint
UPDATE "users" SET "full_name" = "first_name" || ' ' || "last_name";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_mapping" ADD CONSTRAINT "post_mapping_post_code_posts_post_code_fk" FOREIGN KEY ("post_code") REFERENCES "public"."posts"("post_code") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_mapping" ADD CONSTRAINT "post_mapping_degree_id_degrees_degree_id_fk" FOREIGN KEY ("degree_id") REFERENCES "public"."degrees"("degree_id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "candidate_qualifications" DROP COLUMN IF EXISTS "institution_name";--> statement-breakpoint
ALTER TABLE "candidate_qualifications" DROP COLUMN IF EXISTS "year_of_passing";--> statement-breakpoint
ALTER TABLE "candidate_qualifications" DROP COLUMN IF EXISTS "roll_number";--> statement-breakpoint
ALTER TABLE "candidate_qualifications" DROP COLUMN IF EXISTS "grade";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "first_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_name";