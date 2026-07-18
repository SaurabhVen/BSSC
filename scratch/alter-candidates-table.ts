import { getDb, closeDb } from '../src/database/drizzle';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const queries = [
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "service_period" varchar(100);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "ncc_cert_no" varchar(100);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "post_name" varchar(100);`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "has_agreement" boolean DEFAULT false NOT NULL;`,
  `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "contractual_period" varchar(100);`
];

async function main() {
  const db = getDb();
  console.log('Connecting to database and running custom alter statements for candidate table...');

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
