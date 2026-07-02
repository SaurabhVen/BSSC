CREATE TABLE IF NOT EXISTS "disabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "disabilities_code_unique" UNIQUE("code")
);
