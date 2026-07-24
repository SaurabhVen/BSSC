import { applicationService } from '../src/services/application.service';
import { userRepository } from '../src/repositories/user.repository';
import { getDb, closeDb } from '../src/database/drizzle';
import { candidates, candidateMetadata, paidCandidates } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const email = 'anil@yopmail.com';
  console.log(`Starting custom fields test for: ${email}`);

  const user = await userRepository.findByEmail(email);
  if (!user) {
    console.error('❌ User not found for email:', email);
    return;
  }

  const candidate = await userRepository.findCandidateByUserId(user.id);
  if (!candidate) {
    console.error('❌ Candidate profile not found for user ID:', user.id);
    return;
  }

  console.log(`Candidate ID: ${candidate.id}`);

  // Fetch the application for the candidate
  const db = getDb();
  const apps = await db.select().from(require('../src/database/schema').applications).where(eq(require('../src/database/schema').applications.candidateId, candidate.id)).limit(1);
  if (apps.length === 0) {
    console.error('❌ Application not found for candidate:', candidate.id);
    return;
  }
  const app = apps[0];
  console.log(`Application ID: ${app.id}`);

  // Seed a paid candidate record to make verification succeed
  await db.delete(paidCandidates).where(eq(paidCandidates.regId, 20260001));
  await db.insert(paidCandidates).values({
    regId: 20260001,
    fullName: 'Anil Kumar',
    fatherName: 'Father Kumar',
    motherName: 'Mother Devi'
  });

  // 1. Call saveStep for Step 1 with custom fields
  console.log('\n--- 1. Testing saveStep with custom fields ---');
  const result = await applicationService.saveStep(app.id, candidate.id, 1, {
    fullName: 'Anil Kumar',
    fatherName: 'Father Kumar',
    motherName: 'Mother Devi',
    dateOfBirth: '16-10-1999',
    gender: 'MALE',
    nationality: 'Indian',
    mobileNo: '9876543210',
    emailId: 'anil@yopmail.com',
    previouslyRegistered: 'YES',
    oldRegistrationNumber: '20260001',
    governmentIdNumber: 'GOV-98765',
    declaration: true
  });
  console.log('✅ saveStep succeeded! Returned currentStep:', result.currentStep);

  // 2. Direct database lookup to verify columns in candidates table
  console.log('\n--- 2. Checking candidates table directly ---');
  const candidateRow = await db.select().from(candidates).where(eq(candidates.id, candidate.id)).limit(1);
  console.log('Candidate Table Record previouslyRegistered:', candidateRow[0].previouslyRegistered);
  if (candidateRow[0].previouslyRegistered === 'YES') {
    console.log('✅ Correctly stored in candidates table!');
  } else {
    console.error('❌ Not stored in candidates table!');
  }

  // 3. Direct database lookup to verify columns in candidate_metadata table
  console.log('\n--- 3. Checking candidate_metadata table directly ---');
  const metaRow = await db.select().from(candidateMetadata).where(eq(candidateMetadata.candidateId, candidate.id)).limit(1);
  console.log('Metadata Table Record governmentIdNumber:', metaRow[0].governmentIdNumber);
  if (metaRow[0].governmentIdNumber === 'GOV-98765') {
    console.log('✅ Correctly stored in candidate_metadata table!');
  } else {
    console.error('❌ Not stored in candidate_metadata table!');
  }

  // 4. Retrieve step data using getAllStepsData to verify Step 1 return output
  console.log('\n--- 4. Checking Step 1 API payload output ---');
  const allSteps = await applicationService.getAllStepsData(candidate.id);
  const step1Data = (allSteps.steps as any).step1;
  console.log('Step 1 previouslyRegistered in response:', step1Data.previouslyRegistered);
  console.log('Step 1 governmentIdNumber in response:', step1Data.governmentIdNumber);
  if (step1Data.previouslyRegistered === 'YES' && step1Data.governmentIdNumber === 'GOV-98765') {
    console.log('✅ Correctly mapped to Step 1 payload!');
  } else {
    console.error('❌ Mismatch in returned payload!');
  }

  await closeDb();
}

main().catch(console.error);
