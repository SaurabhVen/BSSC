import { getDb, closeDb } from '../src/database/drizzle';
import { paidCandidates } from '../src/database/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = getDb();
  console.log('Inserting test prepaid candidate into paid_candidates table...');
  
  const testRegId = 20269999;
  
  // Clean up any existing record
  await db.delete(paidCandidates).where(eq(paidCandidates.regId, testRegId));
  
  await db.insert(paidCandidates).values({
    regId: testRegId,
    fullName: 'Prepaid Test Candidate',
    fatherName: 'Prepaid Father',
    motherName: 'Prepaid Mother',
    primaryCategory: 'GEN',
  });

  console.log('Test prepaid candidate inserted successfully:');
  console.log('- RegId (Old Registration Number):', testRegId);
  console.log('- Father Name: Prepaid Father');
  console.log('- Mother Name: Prepaid Mother');
  
  await closeDb();
}

main().catch(err => {
  console.error('Error inserting test prepaid candidate:', err);
  process.exit(1);
});
