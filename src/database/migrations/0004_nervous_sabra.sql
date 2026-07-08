CREATE TABLE IF NOT EXISTS "countries" (
	"country_id" bigserial PRIMARY KEY NOT NULL,
	"country_name" varchar(100) NOT NULL,
	"country_code" varchar(10) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "countries_country_code_unique" UNIQUE("country_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "districts" (
	"district_id" bigserial PRIMARY KEY NOT NULL,
	"state_id" bigint NOT NULL,
	"district_name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "states" (
	"state_id" bigserial PRIMARY KEY NOT NULL,
	"country_id" bigint NOT NULL,
	"state_name" varchar(100) NOT NULL,
	"state_code" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "districts" ADD CONSTRAINT "districts_state_id_states_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("state_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "states" ADD CONSTRAINT "states_country_id_countries_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("country_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
