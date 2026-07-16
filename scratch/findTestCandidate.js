const { getDb, closeDb } = require('../src/database/drizzle');
const { sql } = require('drizzle-orm');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const findCandidate = async () => {
  const db = getDb();
  console.log('Connecting to database...');
  try {
    const result = await db.execute(sql.raw(`
      SELECT * FROM "users" ORDER BY "created_at" DESC LIMIT 5;
    `));
    console.log('--- LATEST 5 USERS ---');
    result.rows.forEach(row => {
      console.log(`User ID: ${row.id}, Email: ${row.email}, Created At: ${row.created_at}`);
    });

    const result2 = await db.execute(sql.raw(`
      SELECT * FROM "candidates" ORDER BY "created_at" DESC LIMIT 5;
    `));
    console.log('--- LATEST 5 CANDIDATES ---');
    result2.rows.forEach(row => {
      console.log(`Candidate ID: ${row.id}, User ID: ${row.user_id}, Registration No: ${row.registration_number}, Created At: ${row.created_at}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await closeDb();
  }
};

findCandidate();
