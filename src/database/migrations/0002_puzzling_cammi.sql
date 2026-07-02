CREATE TABLE IF NOT EXISTS "categories" (
	"cat_id" bigserial PRIMARY KEY NOT NULL,
	"cat_user_id" bigint NOT NULL,
	"cat_name" varchar(255) NOT NULL,
	"cat_parent_id" bigint,
	"cat_publish" smallint DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "educations" (
	"edu_id" bigserial PRIMARY KEY NOT NULL,
	"edu_user_id" bigint NOT NULL,
	"edu_name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"cat_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_educations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"edu_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_subjects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"sub_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_vacancys" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"vac_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"post_id" bigserial PRIMARY KEY NOT NULL,
	"post_user_id" bigint NOT NULL,
	"cat_id" bigint NOT NULL,
	"edu_id" bigint,
	"post_title" varchar(500) NOT NULL,
	"post_slug" varchar(500),
	"post_content" text,
	"post_publish" smallint DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subjects" (
	"sub_id" bigserial PRIMARY KEY NOT NULL,
	"sub_user_id" bigint NOT NULL,
	"sub_name" varchar(255) NOT NULL,
	"sub_publish" smallint DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vacancys" (
	"vac_id" bigserial PRIMARY KEY NOT NULL,
	"vac_user_id" bigint NOT NULL,
	"vac_name" varchar(255) NOT NULL,
	"vac_publish" smallint DEFAULT 1
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_post_id_posts_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_cat_id_categories_cat_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."categories"("cat_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_educations" ADD CONSTRAINT "post_educations_post_id_posts_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_educations" ADD CONSTRAINT "post_educations_edu_id_educations_edu_id_fk" FOREIGN KEY ("edu_id") REFERENCES "public"."educations"("edu_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_subjects" ADD CONSTRAINT "post_subjects_post_id_posts_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_subjects" ADD CONSTRAINT "post_subjects_sub_id_subjects_sub_id_fk" FOREIGN KEY ("sub_id") REFERENCES "public"."subjects"("sub_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_vacancys" ADD CONSTRAINT "post_vacancys_post_id_posts_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_vacancys" ADD CONSTRAINT "post_vacancys_vac_id_vacancys_vac_id_fk" FOREIGN KEY ("vac_id") REFERENCES "public"."vacancys"("vac_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_cat_id_categories_cat_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."categories"("cat_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_edu_id_educations_edu_id_fk" FOREIGN KEY ("edu_id") REFERENCES "public"."educations"("edu_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "post_categories_post_id_cat_id_idx" ON "post_categories" ("post_id","cat_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "post_educations_post_id_edu_id_idx" ON "post_educations" ("post_id","edu_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "post_subjects_post_id_sub_id_idx" ON "post_subjects" ("post_id","sub_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "post_vacancys_post_id_vac_id_idx" ON "post_vacancys" ("post_id","vac_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "posts_post_slug_idx" ON "posts" ("post_slug");--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "mobile_verification_token";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "email_verification_token";