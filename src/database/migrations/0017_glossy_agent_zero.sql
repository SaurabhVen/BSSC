ALTER TABLE "candidates" ADD COLUMN "gender" varchar(20);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "category" varchar(30);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "caste" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "bihar_domicile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_pwd" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "disability_type" varchar(50);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "pwd_40_percent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_ex_serviceman" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_ncc_cadet" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_bihar_govt_emp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_contractual_emp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "bssc_attempts" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "non_creamy_layer" boolean DEFAULT false NOT NULL;