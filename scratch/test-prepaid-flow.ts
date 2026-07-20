import { getDb, closeDb } from '../src/database/drizzle';
import { users, roles, candidates, applications, applicationStepData, payments, candidateMetadata } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { applicationService } from '../src/services/application.service';
import { paymentService } from '../src/services/payment.service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('--- STARTING PRE-PAID SYNC & FLOW VERIFICATION ---');

  const testEmail = `test.prepaid.${Date.now()}@example.com`;
  let tempUserId: string | null = null;
  let tempCandidateId: string | null = null;
  let tempApplicationId: string | null = null;

  try {
    // Get candidate role ID
    const roleRows = await db.select().from(roles).where(eq(roles.name, 'candidate')).limit(1);
    if (roleRows.length === 0) {
      throw new Error('Candidate role not found in database. Run seeding first.');
    }
    const roleId = roleRows[0].id;

    // 1. Create a temporary User
    console.log('Creating temporary test user...');
    const [tempUser] = await db.insert(users).values({
      email: testEmail,
      fullName: 'Paid Candidate 1',
      passwordHash: 'dummyhash',
      roleId: roleId,
      isActive: true,
    }).returning();
    tempUserId = tempUser.id;

    // 2. Create a temporary Candidate (without setting oldRegistrationNumber here!)
    console.log('Creating temporary candidate profile...');
    const [tempCandidate] = await db.insert(candidates).values({
      userId: tempUser.id,
      registrationNumber: `NEWREG_${Date.now().toString().slice(-6)}`,
      dateOfBirth: new Date(1996, 5, 15),
      mobileNumber: '9999000001',
    }).returning();
    tempCandidateId = tempCandidate.id;

    // Create candidate metadata
    await db.insert(candidateMetadata).values({
      candidateId: tempCandidate.id,
      gender: 'male',
      category: 'GEN',
      biharDomicile: false,
      isPwd: false,
    });

    // 3. Create Draft Application
    console.log('Creating draft application...');
    const draft = await applicationService.getOrCreateDraft(tempCandidateId);
    tempApplicationId = draft.applicationId;

    // 4. Save Step 0 (Personal Details without oldRegistrationNumber)
    console.log('Saving Step 0 (Personal Details)...');
    await applicationService.saveStep(tempApplicationId, tempCandidateId, 0, {
      fullName: 'Paid Candidate 1',
      fatherName: 'Father of Candidate 1',
      motherName: 'Mother of Candidate 1',
      dateOfBirth: '15-06-1996',
      gender: 'male',
      maritalStatus: 'unmarried',
      nationality: 'India',
      identificationMark1: 'Mole on neck',
      mobileNumber: '9999000001',
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

    // 6. Save Step 1 (Category / Domicile) with oldRegistrationNumber
    console.log('Saving Step 1 (Category/Domicile)...');
    await applicationService.saveStep(tempApplicationId, tempCandidateId, 1, {
      oldRegistrationNumber: '20260001',
      isBiharDomicile: false,
      isPwd: false,
      isExServiceman: false,
      isBiharGovtEmp: false,
    });

    // 5. Verify if oldRegistrationNumber is synced to the candidates table
    console.log('Verifying if oldRegistrationNumber was synced to the candidates table...');
    const updatedCandidate = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, tempCandidateId))
      .limit(1);

    const savedOldReg = updatedCandidate[0]?.oldRegistrationNumber;
    console.log(`- Saved oldRegistrationNumber in DB: "${savedOldReg}"`);
    if (savedOldReg !== '20260001') {
      console.warn('WARNING: oldRegistrationNumber was NOT synced to the candidates table! (Only saved in step data)');
    } else {
      console.log('SUCCESS: oldRegistrationNumber successfully synced to candidates table!');
    }

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

    console.log('--- ALL FLOWS VERIFIED SUCCESSFULLY ---');
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
