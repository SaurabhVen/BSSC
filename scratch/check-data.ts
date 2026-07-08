import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates } from '../src/database/schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Connecting to database...');

  try {
    const allUsers = await db.select().from(users).limit(10);
    const allCandidates = await db.select().from(candidates).limit(10);

    console.log(`\n=== Users Table (Total Rows found: ${allUsers.length}) ===`);
    allUsers.forEach((u, i) => {
      console.log(`[User ${i + 1}] ID: ${u.id} | Email: ${u.email} | Name: ${u.fullName}`);
    });

    console.log(`\n=== Candidates Table (Total Rows found: ${allCandidates.length}) ===`);
    allCandidates.forEach((c, i) => {
      console.log(`[Candidate ${i + 1}] ID: ${c.id} | Reg No: ${c.registrationNumber} | Mobile: ${c.mobileNumber}`);
    });

  } catch (err: any) {
    console.error('Error querying database:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(closeDb);
