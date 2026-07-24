ALTER TABLE "candidate_metadata" ADD COLUMN "service_from_date" timestamp;--> statement-breakpoint
ALTER TABLE "candidate_metadata" ADD COLUMN "service_to_date" timestamp;--> statement-breakpoint
ALTER TABLE "candidate_metadata" ADD COLUMN "contractual_from_date" timestamp;--> statement-breakpoint
ALTER TABLE "candidate_metadata" ADD COLUMN "contractual_to_date" timestamp;--> statement-breakpoint
ALTER TABLE "candidate_metadata" ADD COLUMN "is_own_scribe" boolean DEFAULT false NOT NULL;