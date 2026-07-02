import { sql } from 'drizzle-orm';
import { getDb, closeDb } from './drizzle';

const dropOldTables = async (): Promise<void> => {
  console.log(' Starting database table drop...\n');
  const db = getDb();

  try {
    const dropQuery = sql.raw(
      `DROP TABLE IF EXISTS "post_categories", "post_educations", "post_subjects", "post_vacancys" CASCADE;`
    );
    console.log(' Dropping legacy post_* tables...');
    await db.execute(dropQuery);
    console.log('\n Legacy tables dropped successfully!');
  } catch (err: any) {
    console.error(' Error dropping tables:', err.message, err.stack);
    process.exit(1);
  }
};

dropOldTables()
  .catch((err: Error) => {
    console.error(' Drop script failed:', err.message, err.stack);
    process.exit(1);
  })
  .finally(closeDb);
