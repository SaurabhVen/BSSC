const { getDb, closeDb } = require('../src/database/drizzle');
const { sql } = require('drizzle-orm');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const checkSchema = async () => {
  const db = getDb();
  try {
    const result = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'candidates';
    `));
    console.log('--- CANDIDATES COLUMNS IN DB ---');
    result.rows.forEach(row => {
      console.log(`Column: ${row.column_name}, Type: ${row.data_type}, Nullable: ${row.is_nullable}`);
    });
  } catch (err) {
    console.error('Error querying schema:', err.message);
  } finally {
    await closeDb();
  }
};

checkSchema();
