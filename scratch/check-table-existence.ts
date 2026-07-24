import { getDb, closeDb } from '../src/database/drizzle';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Querying database tables...');
  try {
    const result = await db.execute(sql`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
    `);
    console.log('Tables in public schema:');
    result.rows.forEach((row: any) => {
      console.log(`- ${row.table_name}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

main().then(() => closeDb());
