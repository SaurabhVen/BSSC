import { getDb, closeDb } from '../src/database/drizzle';
import { applicationService } from '../src/services/application.service';
import { paymentService } from '../src/services/payment.service';
import { users, candidates, applications, applicationStepData, candidateMetadata, payments, roles } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { generateUUID } from '../src/utils/crypto';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('--- STARTING PRE-PAID V2 FLOW VERIFICATION ---');
  const db = getDb();
  
  const testEmail = 'test.prepaidv2@example.com';
  let tempUserId: string | null = null;
  let tempCandidateId: string | null = null;
  let tempApplicationId: string | null = null;

  try {
    // 0. Find or create role
    let candidateRole = await db.select().from(roles).where(eq(roles.name, 'candidate')).limit(1);
    let roleId: string;
    if (candidateRole.length === 0) {
      const newRole = await db.insert(roles).values({
        name: 'candidate',
        description: 'Candidate role',
      }).returning();
      roleId = newRole[0].id;
    } else {
      roleId = candidateRole[0].id;
    }

    // 1. Create a User in local DB
    console.log('Creating temporary test user...');
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);
    const userResult = await db.insert(users).values({
      id: generateUUID(),
      email: testEmail,
      fullName: 'Prepaid Test Candidate',
      passwordHash,
      roleId,
    }).returning();
    tempUserId = userResult[0].id;

    // 2. Create Candidate profile
    console.log('Creating temporary candidate profile...');
    const candidateResult = await db.insert(candidates).values({
      id: generateUUID(),
      userId: tempUserId,
      mobileNumber: '9999000002',
      dateOfBirth: new Date('1996-06-15'),
    }).returning();
    tempCandidateId = candidateResult[0].id;

    // 3. Create Draft Application
    console.log('Creating draft application...');
    const draft = await applicationService.getOrCreateDraft(tempCandidateId);
    tempApplicationId = draft.applicationId;

    // 4. Save Step 0 (Personal Details - without oldRegistrationNumber)
    console.log('Saving Step 0 (Personal Details)...');
    await applicationService.saveStep(tempApplicationId, tempCandidateId, 0, {
      fullName: 'Prepaid Test Candidate',
      fatherName: 'Prepaid Father',
      motherName: 'Prepaid Mother',
      dateOfBirth: '15-06-1996',
      gender: 'male',
      maritalStatus: 'unmarried',
      nationality: 'India',
      identificationMark1: 'Mole on neck',
      mobileNumber: '9999000002',
      emailId: testEmail,
      address: {
        permanent: {
          street: 'Main Street',
          post: 'Main Post',
          district: 'Patna',
          city: 'Patna',
          state: 'Bihar',
          pincode: '800001',
          country: 'India'
        }
      }
    });

    // 5. Save Step 1 (Category/Domicile) with oldRegistrationNumber = 20269999
    console.log('Saving Step 1 (Category/Domicile)...');
    await applicationService.saveStep(tempApplicationId, tempCandidateId, 1, {
      oldRegistrationNumber: '20269999',
      isBiharDomicile: false,
      isPwd: false,
      isExServiceman: false,
      isBiharGovtEmp: false,
    });

    // 6. Verify if oldRegistrationNumber was synced to candidates table
    console.log('Verifying if oldRegistrationNumber was synced to the candidates table...');
    const updatedCandidate = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, tempCandidateId))
      .limit(1);

    const savedOldReg = updatedCandidate[0]?.oldRegistrationNumber;
    console.log(`- Saved oldRegistrationNumber in DB: "${savedOldReg}"`);
    if (savedOldReg !== '20269999') {
      throw new Error('Verification failed: oldRegistrationNumber was NOT synced to the candidates table!');
    }
    console.log('SUCCESS: oldRegistrationNumber successfully synced to candidates table!');

    // 7. Initiate Payment
    console.log('Initiating Payment...');
    const paymentResult = await paymentService.initiatePayment({
      applicationId: tempApplicationId,
      candidateId: tempCandidateId,
      paymentMode: 'online',
      feeCategory: 'GEN',
    });

    console.log('Payment Initiation Result:');
    console.log(`- Amount calculated: ${paymentResult.amount} INR (Expected: 0 INR)`);
    console.log(`- Is Free: ${paymentResult.isFree} (Expected: true)`);
    console.log(`- Order ID: ${paymentResult.paymentOrderId}`);

    if (paymentResult.amount !== 0 || !paymentResult.isFree) {
      throw new Error('Verification failed: Amount is not 0 or isFree is not true.');
    }

    // 8. Process Free Return
    console.log('Completing free payment...');
    await paymentService.completeFreePayment(paymentResult.paymentOrderId);

    // 9. Verify Application Status is unlocked
    console.log('Verifying final application status...');
    const finalApp = await applicationService.getApplicationStatus(tempApplicationId, tempCandidateId);
    console.log(`- Application status: ${finalApp.status} (Expected: payment_completed)`);

    if (finalApp.status !== 'payment_completed') {
      throw new Error('Verification failed: Application status is incorrect.');
    }

    console.log('--- ALL FLOWS VERIFIED SUCCESSFULLY FOR 20269999 ---');
  } catch (err: any) {
    console.error('--- VERIFICATION FAILED ---');
    console.error(err.message || err);
  } finally {
    // CLEAN UP Test Records
    console.log('Cleaning up test records from database...');
    try {
      if (tempApplicationId) {
        await db.delete(payments).where(eq(payments.applicationId, tempApplicationId));
        await db.delete(applicationStepData).where(eq(applicationStepData.applicationId, tempApplicationId));
        await db.delete(applications).where(eq(applications.id, tempApplicationId));
      }
      if (tempCandidateId) {
        await db.delete(candidateMetadata).where(eq(candidateMetadata.candidateId, tempCandidateId));
        await db.delete(candidates).where(eq(candidates.id, tempCandidateId));
      }
      if (tempUserId) {
        await db.delete(users).where(eq(users.id, tempUserId));
      }
      console.log('Clean up done.');
    } catch (cleanErr: any) {
      console.error('Error during cleanup:', cleanErr.message);
    }
    await closeDb();
  }
}

main().then(() => process.exit(0));
