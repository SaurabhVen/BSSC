import { getDb, closeDb } from '../src/database/drizzle';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Querying final_submissions table info...');
  try {
    const countResult = await db.execute(sql`
      SELECT COUNT(*) FROM final_submissions;
    `);
    console.log('Total rows in final_submissions:', countResult.rows[0].count);

    const latestResult = await db.execute(sql`
      SELECT id, application_id, candidate_id, created_at FROM final_submissions ORDER BY created_at DESC LIMIT 5;
    `);
    console.log('Latest 5 submissions:');
    latestResult.rows.forEach((row: any) => {
      console.log(`- ID: ${row.id}, Application ID: ${row.application_id}, Candidate ID: ${row.candidate_id}, Created At: ${row.created_at}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

main().then(() => closeDb());
