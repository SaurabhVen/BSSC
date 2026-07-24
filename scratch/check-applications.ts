import { getDb, closeDb } from '../src/database/drizzle';
import { candidates, applications, candidateMetadata } from '../src/database/schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Connecting to database...');

  try {
    const allCandidates = await db.select().from(candidates);
    console.log(`\n=== Candidates (Total: ${allCandidates.length}) ===`);
    allCandidates.forEach((c) => {
      console.log(`ID: ${c.id} | UserID: ${c.userId} | RegNo: ${c.registrationNumber}`);
    });

    const allApps = await db.select().from(applications);
    console.log(`\n=== Applications (Total: ${allApps.length}) ===`);
    allApps.forEach((a) => {
      console.log(`ID: ${a.id} | CandidateID: ${a.candidateId} | Status: ${a.status}`);
    });

    const allMeta = await db.select().from(candidateMetadata);
    console.log(`\n=== Candidate Metadata (Total: ${allMeta.length}) ===`);
    allMeta.forEach((m) => {
      console.log(`ID: ${m.id} | CandidateID: ${m.candidateId} | Gender: ${m.gender} | Category: ${m.category}`);
    });
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(closeDb);
