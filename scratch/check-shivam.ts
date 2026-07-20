import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications, candidateMetadata } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Querying database for shivam@vensysco.in...');

  try {
    const user = await db.select().from(users).where(eq(users.email, 'shivam@vensysco.in')).limit(1);
    if (user.length === 0) {
      console.log('❌ User shivam@vensysco.in not found in database.');
      return;
    }

    console.log(`\n=== User ===\nID: ${user[0].id} | Email: ${user[0].email} | FullName: ${user[0].fullName}`);

    const candidate = await db.select().from(candidates).where(eq(candidates.userId, user[0].id)).limit(1);
    if (candidate.length === 0) {
      console.log('❌ Candidate record not found for this user.');
      return;
    }

    console.log(`\n=== Candidate ===\nID: ${candidate[0].id} | RegNo: ${candidate[0].registrationNumber}`);

    const meta = await db.select().from(candidateMetadata).where(eq(candidateMetadata.candidateId, candidate[0].id)).limit(1);
    if (meta.length === 0) {
      console.log('❌ Candidate Metadata record not found.');
    } else {
      console.log(`\n=== Metadata ===\nID: ${meta[0].id} | Gender: ${meta[0].gender} | Category: ${meta[0].category}`);
    }

    const apps = await db.select().from(applications).where(eq(applications.candidateId, candidate[0].id));
    console.log(`\n=== Applications (Total: ${apps.length}) ===`);
    apps.forEach((a) => {
      console.log(`ID: ${a.id} | Status: ${a.status} | isSubmitted: ${a.isSubmitted}`);
    });

  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(closeDb);
