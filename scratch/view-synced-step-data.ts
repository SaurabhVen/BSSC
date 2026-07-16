import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications, applicationStepData } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const email = process.argv[2] || 'shivam+32@vensysco.in';
  const db = getDb();
  console.log(`Connecting to database to verify Step 0 data for ${email}...`);

  const userRecord = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  if (userRecord.length === 0) {
    console.error('User not found.');
    return;
  }

  const candidateRecord = await db.select().from(candidates).where(eq(candidates.userId, userRecord[0].id)).limit(1);
  if (candidateRecord.length === 0) {
    console.error('Candidate not found.');
    return;
  }

  const appRecord = await db.select().from(applications).where(eq(applications.candidateId, candidateRecord[0].id)).limit(1);
  if (appRecord.length === 0) {
    console.error('Application not found.');
    return;
  }

  const stepRecords = await db.select().from(applicationStepData)
    .where(eq(applicationStepData.applicationId, appRecord[0].id))
    .orderBy(applicationStepData.stepNumber);

  if (stepRecords.length === 0) {
    console.error('Step data not found.');
    return;
  }

  console.log('\n=== Synced Step Data in Database ===');
  stepRecords.forEach((step) => {
    console.log(`\n--- Step ${step.stepNumber} JSON Data ---`);
    console.log(JSON.stringify(step.data, null, 2));
  });
}

main().catch(console.error).finally(closeDb);
