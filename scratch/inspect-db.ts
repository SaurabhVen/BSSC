import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  let connectionString = process.env.DATABASE_URL;
  console.log('Using DATABASE_URL:', connectionString);
  
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in process.env!');
    process.exit(1);
  }

  connectionString = connectionString.replace('sslmode=require', 'sslmode=no-verify');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    const columnsRes = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'educations';
    `);
    console.log('Educations Columns:', columnsRes.rows);
  } catch (err) {
    console.error('Query error:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
