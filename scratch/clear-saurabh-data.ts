import dotenv from 'dotenv';
dotenv.config();

import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications, applicationStepData } from '../src/database/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Connecting to database for cleanup...');
  const db = getDb();
  const email = 'saurabh+9@vensysco.in';

  try {
    // 1. Find user
    const userRow = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userRow.length === 0) {
      console.error(`User with email ${email} not found!`);
      return;
    }
    const user = userRow[0];

    // 2. Find candidate
    const candRow = await db.select().from(candidates).where(eq(candidates.userId, user.id)).limit(1);
    if (candRow.length === 0) {
      console.error(`Candidate profile not found for user ID: ${user.id}`);
      return;
    }
    const candidate = candRow[0];

    // 3. Find application
    const appRow = await db.select().from(applications).where(eq(applications.candidateId, candidate.id)).limit(1);
    if (appRow.length === 0) {
      console.log('No application found to clean up.');
      return;
    }
    const applicationId = appRow[0].id;

    // 4. Delete all step data rows for this application
    await db.delete(applicationStepData).where(eq(applicationStepData.applicationId, applicationId));
    console.log(`- Deleted all step data rows for application ID: ${applicationId}`);

    // 5. Reset application steps progress
    await db.update(applications).set({
      currentStep: 0,
      completedSteps: [],
      updatedAt: new Date(),
    }).where(eq(applications.id, applicationId));
    console.log('- Reset application progress (currentStep=0, completedSteps=[]).');

    console.log('\n✅ Successfully cleared seeded mock data for candidate!');
  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    await closeDb();
  }
}

main().catch(console.error);
