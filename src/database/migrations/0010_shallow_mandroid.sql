ALTER TABLE "degrees" ADD COLUMN "degree_type" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "degrees" ADD CONSTRAINT "degrees_degree_type_unique" UNIQUE("degree_type");