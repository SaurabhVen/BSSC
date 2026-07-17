CREATE TABLE IF NOT EXISTS "paid_candidates" (
	"RegId" bigint PRIMARY KEY NOT NULL,
	"Full_NameV" varchar(100),
	"Father_NameV" varchar(100),
	"Mother_NameV" varchar(100),
	"Primary_CategoryV" varchar(5),
	"SB_orderV" varchar(30),
	"SB_transidV" varchar(30),
	"SB_statusV" varchar(30),
	"SB_amtV" varchar(10),
	"SB_tnsDateV" varchar(40),
	"SB_pay_IP" varchar(30),
	"IC_orderV" varchar(50),
	"IC_transidV" varchar(100),
	"IC_statusV" varchar(15),
	"IC_amtV" varchar(8),
	"IC_tnsDateV" varchar(30),
	"IC_pay_IP" varchar(30)
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_cognito_sub_id_unique";--> statement-breakpoint
ALTER TABLE "educations" DROP CONSTRAINT "educations_application_id_applications_id_fk";
--> statement-breakpoint
ALTER TABLE "educations" DROP CONSTRAINT "educations_job_qualification_id_job_qualifications_sl_no_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "users_cognito_sub_idx";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "application_id";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "level";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "degree";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "board_university";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "total_marks";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "marks_obtained";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "percentage";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "specialization";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "passing_year";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "job_qualification_id";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "created_at";--> statement-breakpoint
ALTER TABLE "educations" DROP COLUMN IF EXISTS "updated_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "cognito_sub_id";