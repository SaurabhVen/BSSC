import { sql } from 'drizzle-orm';
import { getDb, closeDb } from './drizzle';

const truncateAllTables = async (): Promise<void> => {
  console.log(' Starting database truncation...\n');
  const db = getDb();

  try {
    // 1. Get all table names in the 'public' schema
    const query = sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `;

    // Execute the raw query to get tables
    const result = await db.execute(query);
    const tables = result.rows.map((row: any) => row.tablename);

    if (tables.length === 0) {
      console.log(' No tables found in public schema.');
      return;
    }

    // Filter out the drizzle migration history table if you want to keep migrations intact
    const tablesToTruncate = tables.filter((t) => t !== '__drizzle_migrations');

    if (tablesToTruncate.length === 0) {
      console.log(' No application tables to truncate.');
      return;
    }

    // 2. Truncate all tables with CASCADE to handle foreign key dependencies
    const truncateQuery = sql.raw(`TRUNCATE TABLE "${tablesToTruncate.join('", "')}" CASCADE;`);

    console.log(` Truncating ${tablesToTruncate.length} tables...`);
    await db.execute(truncateQuery);

    console.log('\n All tables truncated successfully!');
  } catch (err: any) {
    console.error(' Error truncating tables. Please check database configuration.');
    process.exit(1);
  }
};

truncateAllTables()
  .catch((err: Error) => {
    console.error(' Truncate script failed.');
    process.exit(1);
  })
  .finally(closeDb);
