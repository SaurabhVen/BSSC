ALTER TABLE "candidate_metadata" ADD COLUMN "government_id_number" varchar(50);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "previously_registered" varchar(10);