const { getDb, closeDb } = require('../dist/src/database/drizzle');
const { users, candidates } = require('../dist/src/database/schema');
const { eq } = require('drizzle-orm');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function findUser() {
  const db = getDb();
  try {
    const email = 'shivam+4@vensysco.in';
    console.log(`Checking DB for email: ${email}...`);
    const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userRows.length > 0) {
      console.log('✔ User found in DB:', JSON.stringify(userRows[0], null, 2));
      const candidateRows = await db.select().from(candidates).where(eq(candidates.userId, userRows[0].id)).limit(1);
      if (candidateRows.length > 0) {
        console.log('✔ Candidate found in DB:', JSON.stringify(candidateRows[0], null, 2));
      } else {
        console.log('❌ Candidate NOT found in DB.');
      }
    } else {
      console.log('❌ User NOT found in DB.');
    }
  } catch (err) {
    console.error('Error finding user:', err.message);
  } finally {
    closeDb();
  }
}

findUser();
