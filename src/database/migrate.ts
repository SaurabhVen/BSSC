import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, closeDb } from './drizzle';
import path from 'path';

const runMigrations = async (): Promise<void> => {
  console.log('🔄 Running database migrations...');
  const db = getDb();
  await migrate(db, {
    migrationsFolder: path.join(__dirname, 'migrations'),
  });
  console.log('✅ Migrations completed successfully');
};

runMigrations()
  .catch((err: Error) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  })
  .finally(closeDb);
