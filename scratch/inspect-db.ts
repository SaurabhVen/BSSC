import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
<<<<<<< HEAD
  const connectionString = process.env.DATABASE_URL;
=======
  let connectionString = process.env.DATABASE_URL;
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
  console.log('Using DATABASE_URL:', connectionString);
  
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in process.env!');
    process.exit(1);
  }

<<<<<<< HEAD
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const dbRes = await client.query('SELECT current_database(), current_schema(), current_user');
    console.log('DB Context:', dbRes.rows[0]);

    const schemasRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata;
    `);
    console.log('Schemas:', schemasRes.rows.map(r => r.schema_name));

    const tablesRes = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `);
    console.log('Tables:', tablesRes.rows);

    const migrationsRes = await client.query('SELECT * FROM drizzle.__drizzle_migrations');
    console.log('Applied Migrations:', migrationsRes.rows);

=======
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
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
  } catch (err) {
    console.error('Query error:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
