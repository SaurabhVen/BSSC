import { getDb, closeDb } from '../src/database/drizzle';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const queries = [
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "domicile_certificate_number" varchar(100);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "domicile_certificate_authority" varchar(100);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "domicile_certificate_issue_date" timestamp;`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "category_certificate_number" varchar(100);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "category_certificate_authority" varchar(100);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "category_certificate_issue_date" timestamp;`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "pwd_certificate_number" varchar(100);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "pwd_certificate_authority" varchar(100);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "pwd_certificate_issue_date" timestamp;`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "dis_type_persist" varchar(50);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "is_scribe_required" boolean DEFAULT false NOT NULL;`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "organization_name" varchar(200);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "has_post_experience" boolean DEFAULT false NOT NULL;`
];

async function main() {
  const db = getDb();
  console.log('Connecting to database and running custom alter statements for new candidate columns...');

  for (let i = 0; i < queries.length; i++) {
    try {
      console.log(`Running query ${i + 1}/${queries.length}...`);
      await db.execute(sql.raw(queries[i]));
      console.log('✅ Success');
    } catch (err: any) {
      console.error(`❌ Error in query ${i + 1}:`, err.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(closeDb);
