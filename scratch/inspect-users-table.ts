import { getDb, closeDb } from '../src/database/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  const db = getDb();
  try {
    // 1. Query applied migrations
    const migrations = await db.execute(sql`SELECT * FROM drizzle.__drizzle_migrations`);
    console.log('Applied migrations from drizzle.__drizzle_migrations:');
    console.log(migrations.rows);

    // 2. Query columns of users table
    const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log('\nColumns in "users" table:');
    console.log(columns.rows);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main().finally(closeDb);
