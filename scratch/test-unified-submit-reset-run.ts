import { getDb, closeDb } from '../src/database/drizzle';
import { applications, finalSubmissions } from '../src/database/schema';
import { applicationService } from '../src/services/application.service';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  const applicationId = '6592d00f-c1bb-40ea-96df-2452ecbdaa6f';
  const candidateId = '40da5eb8-52c3-497b-989c-8e387cedb658';

  console.log(`Resetting application ${applicationId} to not submitted...`);
  await db
    .update(applications)
    .set({
      isSubmitted: false,
      status: 'payment_completed',
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));

  // Delete previous final submission if it exists
  await db
    .delete(finalSubmissions)
    .where(eq(finalSubmissions.applicationId, applicationId));

  console.log(`Submitting application ${applicationId} using submitApplication...`);
  try {
    const result = await applicationService.submitApplication(applicationId, candidateId);
    console.log('Submission Result:', result);

    // Verify final submission in db
    const subs = await db
      .select()
      .from(finalSubmissions)
      .where(eq(finalSubmissions.applicationId, applicationId));

    console.log(`\n=== Verification ===`);
    console.log(`Found ${subs.length} final submissions in DB for this application.`);
    if (subs.length > 0) {
      console.log(`Submission ID: ${subs[0].id}`);
      console.log(`Steps in payload: ${Object.keys(subs[0].payload || {})}`);
    }
  } catch (err: any) {
    console.error('Error during submission:', err.message || err);
  }
}

main()
  .catch(console.error)
  .finally(closeDb);
