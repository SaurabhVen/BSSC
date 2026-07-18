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
<<<<<<< HEAD
    console.log('Dropping schema "drizzle" and any related migration tables...');
    await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    console.log('✅ Drizzle migration schema dropped successfully!');
  } catch (err) {
    console.error('Error dropping schema:', err);
=======
    console.log('Dropping schema "drizzle" and "public" to reset the database...');
    await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO postgres');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    console.log('✅ Database schema reset successfully!');
  } catch (err) {
    console.error('Error resetting database schema:', err);
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
  } finally {
    await client.end();
  }
}

main().catch(console.error);
