CREATE TABLE IF NOT EXISTS "candidate_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"gender" varchar(20),
	"category" varchar(100),
	"caste" varchar(100),
	"bihar_domicile" boolean DEFAULT false NOT NULL,
	"is_pwd" boolean DEFAULT false NOT NULL,
	"disability_type" varchar(50),
	"pwd_40_percent" boolean DEFAULT false NOT NULL,
	"is_ex_serviceman" boolean DEFAULT false NOT NULL,
	"is_bihar_govt_emp" boolean DEFAULT false NOT NULL,
	"is_contractual_emp" boolean DEFAULT false NOT NULL,
	"bssc_attempts" integer DEFAULT 1 NOT NULL,
	"non_creamy_layer" boolean DEFAULT false NOT NULL,
	"service_period" varchar(100),
	"post_name" varchar(100),
	"has_agreement" boolean DEFAULT false NOT NULL,
	"contractual_period" varchar(100),
	"domicile_certificate_number" varchar(100),
	"domicile_certificate_authority" varchar(100),
	"domicile_certificate_issue_date" timestamp,
	"category_certificate_number" varchar(100),
	"category_certificate_authority" varchar(100),
	"category_certificate_issue_date" timestamp,
	"pwd_certificate_number" varchar(100),
	"pwd_certificate_authority" varchar(100),
	"pwd_certificate_issue_date" timestamp,
	"dis_type_persist" varchar(50),
	"is_scribe_required" boolean DEFAULT false NOT NULL,
	"organization_name" varchar(200),
	"has_post_experience" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "candidate_metadata_candidate_id_unique" UNIQUE("candidate_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_metadata" ADD CONSTRAINT "candidate_metadata_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "candidate_metadata_candidate_id_idx" ON "candidate_metadata" ("candidate_id");--> statement-breakpoint
INSERT INTO "candidate_metadata" (
  "candidate_id", "gender", "category", "caste", "bihar_domicile", "is_pwd", 
  "disability_type", "pwd_40_percent", "is_ex_serviceman", "is_bihar_govt_emp", 
  "is_contractual_emp", "bssc_attempts", "non_creamy_layer", "service_period", 
  "post_name", "has_agreement", "contractual_period", "domicile_certificate_number", 
  "domicile_certificate_authority", "domicile_certificate_issue_date", "category_certificate_number", 
  "category_certificate_authority", "category_certificate_issue_date", "pwd_certificate_number", 
  "pwd_certificate_authority", "pwd_certificate_issue_date", "dis_type_persist", 
  "is_scribe_required", "organization_name", "has_post_experience", "created_at", "updated_at"
)
SELECT 
  "id", "gender", "category", "caste", "bihar_domicile", "is_pwd", 
  "disability_type", "pwd_40_percent", "is_ex_serviceman", "is_bihar_govt_emp", 
  "is_contractual_emp", "bssc_attempts", "non_creamy_layer", "service_period", 
  "post_name", "has_agreement", "contractual_period", "domicile_certificate_number", 
  "domicile_certificate_authority", "domicile_certificate_issue_date", "category_certificate_number", 
  "category_certificate_authority", "category_certificate_issue_date", "pwd_certificate_number", 
  "pwd_certificate_authority", "pwd_certificate_issue_date", "dis_type_persist", 
  "is_scribe_required", "organization_name", "has_post_experience", "created_at", "updated_at"
FROM "candidates"
ON CONFLICT ("candidate_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "gender";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "category";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "caste";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "bihar_domicile";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "is_pwd";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "disability_type";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "pwd_40_percent";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "is_ex_serviceman";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "is_bihar_govt_emp";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "is_contractual_emp";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "bssc_attempts";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "non_creamy_layer";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "service_period";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "post_name";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "has_agreement";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "contractual_period";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "domicile_certificate_number";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "domicile_certificate_authority";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "domicile_certificate_issue_date";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "category_certificate_number";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "category_certificate_authority";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "category_certificate_issue_date";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "pwd_certificate_number";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "pwd_certificate_authority";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "pwd_certificate_issue_date";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "dis_type_persist";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "is_scribe_required";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "organization_name";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "has_post_experience";