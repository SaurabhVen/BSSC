ALTER TABLE "candidates" ADD COLUMN "applicant_name" varchar(150);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "gender" varchar(20);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "domicile_bihar" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "category" varchar(20);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "caste" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "non_creamy_layer" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_pwd" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "pwd_40_percent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "disability_type" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "disability_nature" varchar(50);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "disability_percentage" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_ex_serviceman" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "defence_service_years" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "defence_service_months" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "defence_service_days" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_ncc_full_time" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "ncc_certificate_no" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_bihar_govt_employee" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "govt_service_years" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "govt_service_months" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "govt_service_days" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "bssc_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_contractual_employee" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "contractual_post" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "agreement_available" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "contract_years" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "contract_months" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "contract_days" integer;