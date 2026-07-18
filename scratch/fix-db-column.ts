import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined!');
    process.exit(1);
  }
  if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('sslmode=require', 'sslmode=no-verify');
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    console.log('Adding "cognito_sub_id" column to "users" table safely...');
    await client.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cognito_sub_id" uuid;');
    
    console.log('Creating unique index "users_cognito_sub_idx"...');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "users_cognito_sub_idx" ON "users" ("cognito_sub_id");');
    
    console.log('Adding unique constraint...');
    await client.query('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_cognito_sub_id_unique";');
    await client.query('ALTER TABLE "users" ADD CONSTRAINT "users_cognito_sub_id_unique" UNIQUE ("cognito_sub_id");');
    
    console.log('✅ Database fix applied successfully!');
  } catch (err: any) {
    console.error('Error applying fix:', err.message);
  } finally {
    await client.end();
  }
}

main();
