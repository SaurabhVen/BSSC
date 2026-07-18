ALTER TABLE "candidates" ADD COLUMN "full_name" varchar(200);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "father_name" varchar(200);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "mother_name" varchar(200);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "gender" varchar(10);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "marital_status" varchar(20);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "spouse_name" varchar(200);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "nationality" varchar(50) DEFAULT 'Indian';--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "identity_type" varchar(30);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "identity_number" varchar(50);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "identification_mark_1" varchar(200);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "identification_mark_2" varchar(200);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "permanent_street" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "permanent_post" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "permanent_city" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "permanent_district" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "permanent_state" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "permanent_pincode" varchar(10);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "correspondence_same_as_permanent" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "correspondence_street" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "correspondence_post" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "correspondence_city" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "correspondence_district" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "correspondence_state" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "correspondence_pincode" varchar(10);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "category" varchar(20);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "caste" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "non_creamy_layer" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "bihar_domicile" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "domicile_certificate_number" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_pwd" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "disability_type" varchar(50);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "pwd_40_percent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "pwd_certificate_number" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_ex_serviceman" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_ncc_cadet" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_bihar_govt_emp" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "is_contractual_emp" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "bssc_attempts" smallint DEFAULT 1;