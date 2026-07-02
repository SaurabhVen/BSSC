import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Connecting to database...');

  if (!connectionString) {
    console.error('DATABASE_URL is not defined in process.env!');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Dropping schema "drizzle" and any related migration tables...');
    await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    console.log('✅ Drizzle migration schema dropped successfully!');
  } catch (err) {
    console.error('Error dropping schema:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
