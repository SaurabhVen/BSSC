const { getDb, closeDb } = require('../dist/src/database/drizzle');
const { users, candidates } = require('../dist/src/database/schema');
const { eq } = require('drizzle-orm');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function findUser() {
  const db = getDb();
  try {
    const emails = ['shivam+4@vensysco.in', 'shivam+5@vensysco.in'];
    for (const email of emails) {
      console.log(`Checking DB for email: ${email}...`);
      const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (userRows.length > 0) {
        console.log(`✔ User found in DB for ${email}:`, JSON.stringify(userRows[0], null, 2));
        const candidateRows = await db.select().from(candidates).where(eq(candidates.userId, userRows[0].id)).limit(1);
        if (candidateRows.length > 0) {
          console.log(`✔ Candidate found in DB for ${email}:`, JSON.stringify(candidateRows[0], null, 2));
        } else {
          console.log(`❌ Candidate NOT found in DB for ${email}.`);
        }
      } else {
        console.log(`❌ User NOT found in DB for ${email}.`);
      }
    }
  } catch (err) {
    console.error('Error finding user:', err.message);
  } finally {
    closeDb();
  }
}

findUser();
