import { getDb } from '../src/database/drizzle';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Querying database names...');
  try {
    const result = await db.execute(sql`
      SELECT datname FROM pg_database WHERE datistemplate = false;
    `);
    console.log('Databases:', result.rows);
  } catch (err) {
    console.error('Error:', err);
  }
}

main().then(() => process.exit(0));
