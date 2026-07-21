ALTER TABLE "candidate_metadata" ADD COLUMN "type_of_ex_officer" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidate_metadata" ADD CONSTRAINT "candidate_metadata_type_of_ex_officer_type_of_ex_officers_id_fk" FOREIGN KEY ("type_of_ex_officer") REFERENCES "public"."type_of_ex_officers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
