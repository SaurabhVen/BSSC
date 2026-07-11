import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../.env') });

import { cognitoConfirmSignUp, cognitoAdminGetUser } from '../src/utils/cognito';
import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications } from '../src/database/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const email = process.argv[2] || 'saurabh+9@vensysco.in';
  const otp = process.argv[3];

  if (!otp) {
    console.error('Error: Please provide the OTP code as an argument. Example: npx ts-node scratch/confirm-direct-cognito.ts saurabh+9@vensysco.in 123456');
    process.exit(1);
  }

  console.log(`Confirming registration for: ${email} with OTP: ${otp}`);

  try {
    // 1. Confirm signup in Cognito User Pool
    await cognitoConfirmSignUp(email, otp);
    console.log('✅ Cognito signup confirmed successfully!');

    // 2. Fetch Cognito User to check if attributes/sub are updated
    console.log('\nFetching updated Cognito user profile...');
    const cognitoUser = await cognitoAdminGetUser(email);
    console.log('\nCognito User Attributes:');
    if (cognitoUser && cognitoUser.UserAttributes) {
      console.log(JSON.stringify(cognitoUser.UserAttributes, null, 2));
      const regAttr = (cognitoUser.UserAttributes as any[]).find(attr => attr.Name === 'custom:registration_no');
      if (regAttr) {
        console.log(`\n🎉 Success! custom:registration_no attribute is set to: "${regAttr.Value}"`);
      } else {
        console.log('\n⚠️ Warning: custom:registration_no attribute is NOT found in Cognito yet. (Make sure the postConfirmation trigger was executed).');
      }
    } else {
      console.log('Could not fetch Cognito user.');
    }

    // 3. Check if local database record was synced by postConfirmation trigger
    console.log('\nChecking local database for user sync...');
    const db = getDb();
    const dbUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (dbUsers.length > 0) {
      const user = dbUsers[0];
      console.log(`🎉 Found synced DB user! ID (Cognito Sub): ${user.id} | Email: ${user.email} | Name: ${user.fullName}`);
      
      const candidateRecords = await db.select().from(candidates).where(eq(candidates.userId, user.id));
      if (candidateRecords.length > 0) {
        const candidate = candidateRecords[0];
        console.log(`🎉 Found synced DB Candidate! ID: ${candidate.id} | Registration Number: ${candidate.registrationNumber} | Mobile: ${candidate.mobileNumber}`);
        
        const appRecords = await db.select().from(applications).where(eq(applications.candidateId, candidate.id));
        if (appRecords.length > 0) {
          console.log(`🎉 Found synced DB Application! ID: ${appRecords[0].id} | Status: ${appRecords[0].status}`);
        } else {
          console.log('⚠️ Warning: Application record not found in local DB.');
        }
      } else {
        console.log('⚠️ Warning: Candidate record not found in local DB.');
      }
    } else {
      console.log('⚠️ Warning: User record not found in local DB. The postConfirmation Lambda trigger may have failed or not completed yet.');
    }

  } catch (err: any) {
    console.error('Confirmation failed:', err.message);
  } finally {
    await closeDb();
  }
}

run();
