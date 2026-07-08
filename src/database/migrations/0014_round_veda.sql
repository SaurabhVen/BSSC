CREATE TABLE IF NOT EXISTS "degree_post_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"degree_id" integer,
	"post_code" varchar(10),
	"degree_type" varchar(255) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "degree_post_map" ADD CONSTRAINT "degree_post_map_degree_id_degrees_degree_id_fk" FOREIGN KEY ("degree_id") REFERENCES "public"."degrees"("degree_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "degree_post_map" ADD CONSTRAINT "degree_post_map_post_code_posts_post_code_fk" FOREIGN KEY ("post_code") REFERENCES "public"."posts"("post_code") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "degrees" DROP COLUMN IF EXISTS "post_codes";