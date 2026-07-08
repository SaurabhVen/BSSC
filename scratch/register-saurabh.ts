import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../.env') });

import { authService } from '../src/services/auth.service';
import { getDb, closeDb } from '../src/database/drizzle';
import { 
  users, 
  candidates, 
  applications, 
  applicationStepData,
  finalSubmissions,
  documents,
  payments,
  invoices,
  candidateQualifications,
  candidatePostPreferences,
  candidateLanguages
} from '../src/database/schema';
import { eq, inArray } from 'drizzle-orm';
import { cognitoAdminDeleteUser } from '../src/utils/cognito';

async function run() {
  const email = 'saurabh@vensysco.in';
  console.log(`Starting clean registration process for: ${email}`);

  const db = getDb();

  try {
    // 1. Delete user from local database to avoid primary key or email conflicts
    const existingUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (existingUsers.length > 0) {
      const userId = existingUsers[0].id;
      console.log(`Found local user ${userId}. Deleting candidate and user records recursively...`);

      // Find candidates for this user
      const candidateRecords = await db.select().from(candidates).where(eq(candidates.userId, userId));
      const candidateIds = candidateRecords.map(c => c.id);

      if (candidateIds.length > 0) {
        // Find applications for these candidates
        const applicationRecords = await db.select().from(applications).where(inArray(applications.candidateId, candidateIds));
        const applicationIds = applicationRecords.map(a => a.id);

        if (applicationIds.length > 0) {
          // Find payments for these applications
          const paymentRecords = await db.select().from(payments).where(inArray(payments.applicationId, applicationIds));
          const paymentIds = paymentRecords.map(p => p.id);

          if (paymentIds.length > 0) {
            await db.delete(invoices).where(inArray(invoices.paymentId, paymentIds));
            await db.delete(payments).where(inArray(payments.id, paymentIds));
            console.log('- Deleted payments and invoices.');
          }

          // Delete other tables referencing applications
          await db.delete(applicationStepData).where(inArray(applicationStepData.applicationId, applicationIds));
          await db.delete(finalSubmissions).where(inArray(finalSubmissions.applicationId, applicationIds));
          await db.delete(candidateQualifications).where(inArray(candidateQualifications.applicationId, applicationIds));
          await db.delete(candidatePostPreferences).where(inArray(candidatePostPreferences.applicationId, applicationIds));
          await db.delete(candidateLanguages).where(inArray(candidateLanguages.applicationId, applicationIds));
          
          await db.delete(applications).where(inArray(applications.id, applicationIds));
          console.log('- Deleted applications and referencing records.');
        }

        // Delete tables referencing candidates
        await db.delete(documents).where(inArray(documents.candidateId, candidateIds));
        await db.delete(candidates).where(inArray(candidates.id, candidateIds));
        console.log('- Deleted candidates.');
      }

      await db.delete(users).where(eq(users.id, userId));
      console.log('Local DB cleanup complete.');
    }

    // 2. Delete user from Cognito User Pool
    try {
      await cognitoAdminDeleteUser(email);
      console.log('Deleted existing Cognito user.');
    } catch (err: any) {
      console.log('No existing Cognito user found or delete failed (non-fatal):', err.message);
    }

    // 3. Register user via authService.candidateRegister with ALL custom and standard attributes
    console.log('Calling candidateRegister service with full attributes payload...');
    const result = await authService.candidateRegister({
      fullName: 'Saurabh Vensysco',
      dateOfBirth: '16-10-1999',
      mobileNumber: '8382044417',
      email: email,
      password: 'Password@12345',
      confirmPassword: 'Password@12345',
      
      // Custom and standard attributes
      gender: 'MALE',
      bihar_domicile: 'NO',
      bihar_govt_emp: 'NO',
      bssc_attempts: '2',
      caste: 'GENERIC_CAST',
      category: 'UR',
      contractual_emp: 'NO',
      disability_type: 'TEMPORARY',
      ex_serviceman: 'NO',
      is_pwd: 'NO',
      mobile_no: '8382044417',
      ncc_cadet: 'NO',
      non_creamy_layer: 'NO',
      pwd_40_percent: 'NO',
      contractual_period: 'NO',
      post_name: 'post_1',
      has_agreement: 'NO',
    });

    console.log('\n=== Success! Registration initiated. ===');
    console.log('Result:', result);
    console.log('\nPlease check your email for the Cognito verification OTP.');
  } catch (err: any) {
    console.error('Error during registration process:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  } finally {
    await closeDb();
  }
}

run();
