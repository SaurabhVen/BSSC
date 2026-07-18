import { getDb, closeDb } from '../src/database/drizzle';
import { applicationStepData } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  const oldAppId = '03e303a2-5315-4592-99fb-e5d836862ce2';
  const newAppId = '6592d00f-c1bb-40ea-96df-2452ecbdaa6f';

  console.log(`=== Copying Step Data from ${oldAppId} to ${newAppId} ===`);
  const oldSteps = await db
    .select()
    .from(applicationStepData)
    .where(eq(applicationStepData.applicationId, oldAppId));

  console.log(`Found ${oldSteps.length} step records to copy.`);

  // Delete all existing step data for the new application ID first (once, outside the loop)
  await db
    .delete(applicationStepData)
    .where(eq(applicationStepData.applicationId, newAppId));

  // Copy each step
  for (const stepRow of oldSteps) {
    await db.insert(applicationStepData).values({
      id: uuidv4(),
      applicationId: newAppId,
      stepNumber: stepRow.stepNumber,
      data: stepRow.data
    });
    console.log(`✅ Copied Step ${stepRow.stepNumber}`);
  }

  console.log('=== SUCCESS: Steps successfully copied to new draft application! ===');
}

main().catch(console.error).finally(closeDb);
