import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../.env') });

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
import { CognitoIdentityProviderClient, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import conf from '../src/config';

async function run() {
  const email = 'saurabh+9@vensysco.in';
  console.log(`Starting clean registration process for direct Cognito client-side signup: ${email}`);

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

    // 3. Register user directly via Cognito SDK SignUpCommand (Simulating Client Side / Frontend)
    console.log('Calling Cognito Client-Side SignUp command with user pool attributes...');
    
    const client = new CognitoIdentityProviderClient({ region: conf.AWS_REGION });
    
    const cognitoAttrs = [
      { Name: 'name', Value: 'Saurabh Mishra' },
      { Name: 'given_name', Value: 'Saurabh' },
      { Name: 'family_name', Value: 'Mishra' },
      { Name: 'email', Value: email },
      { Name: 'phone_number', Value: '+918382044417' },
      { Name: 'gender', Value: 'MALE' },
      { Name: 'birthdate', Value: '1999-10-16' },
      { Name: 'custom:bihar_domicile', Value: 'NO' },
      { Name: 'custom:category', Value: 'UR' },
      { Name: 'custom:caste', Value: 'UR' },
      { Name: 'custom:non_creamy_layer', Value: 'NO' },
      { Name: 'custom:is_pwd', Value: 'NO' },
      { Name: 'custom:disability_type', Value: 'NO' },
      { Name: 'custom:pwd_40_percent', Value: 'NO' },
      { Name: 'custom:ex_serviceman', Value: 'NO' },
      { Name: 'custom:service_period', Value: '0-0-0' },
      { Name: 'custom:ncc_cadet', Value: 'NO' },
      { Name: 'custom:ncc_cert_no', Value: 'NA' },
      { Name: 'custom:bihar_govt_emp', Value: 'NO' },
      { Name: 'custom:bssc_attempts', Value: '1' },
      { Name: 'custom:contractual_emp', Value: 'NO' },
      { Name: 'custom:post_name', Value: 'post_1' },
      { Name: 'custom:has_agreement', Value: 'NO' },
      { Name: 'custom:contractual_period', Value: '0-0-0' },
      { Name: 'custom:mobile_no', Value: '8382044417' }
    ];

    const command = new SignUpCommand({
      ClientId: conf.COGNITO_CLIENT_ID,
      Username: email,
      Password: 'Password@12345',
      UserAttributes: cognitoAttrs,
    });

    const result = await client.send(command);

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
