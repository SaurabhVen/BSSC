ALTER TABLE "applications" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "application_reference_number" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "candidates" ALTER COLUMN "category" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DATA TYPE varchar(50);