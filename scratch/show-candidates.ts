import { getDb, closeDb } from '../src/database/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  const db = getDb();
  console.log('Querying candidates table...');
  try {
    const result = await db.execute(sql`SELECT * FROM candidates LIMIT 20`);
    console.log(`\n=== Candidates Table (Total rows found: ${result.rows.length}) ===`);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err: any) {
    console.error('Error querying database:', err.message);
  }
}

main().finally(closeDb);
