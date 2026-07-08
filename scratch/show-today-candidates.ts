import { getDb, closeDb } from '../src/database/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  const db = getDb();
  const todayStr = '2026-07-07 00:00:00';
  console.log(`Searching for records inserted on or after: ${todayStr}...`);

  try {
    const todayUsers = await db.execute(sql`
      SELECT id, email, full_name, created_at 
      FROM users 
      WHERE created_at >= ${todayStr}::timestamp
    `);

    const todayCandidates = await db.execute(sql`
      SELECT id, user_id, registration_number, applicant_name, created_at 
      FROM candidates 
      WHERE created_at >= ${todayStr}::timestamp
    `);

    console.log(`\n=== Users Created Today (${todayUsers.rows.length}) ===`);
    console.log(JSON.stringify(todayUsers.rows, null, 2));

    console.log(`\n=== Candidates Created Today (${todayCandidates.rows.length}) ===`);
    console.log(JSON.stringify(todayCandidates.rows, null, 2));

  } catch (err: any) {
    console.error('Error querying database:', err.message);
  }
}

main().finally(closeDb);
