import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../.env') });

import { CognitoIdentityProviderClient, AdminConfirmSignUpCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import conf from '../src/config';

async function run() {
  const email = 'saurabh+9@vensysco.in';
  console.log(`Admin confirming signup for: ${email}`);

  const client = new CognitoIdentityProviderClient({ region: conf.AWS_REGION });

  try {
    // 1. Confirm signup using AdminConfirmSignUpCommand
    console.log('Sending AdminConfirmSignUpCommand...');
    const confirmCommand = new AdminConfirmSignUpCommand({
      UserPoolId: conf.COGNITO_USER_POOL_ID,
      Username: email,
    });
    await client.send(confirmCommand);
    console.log('✅ User confirmed successfully by admin!');

    // 2. Fetch Cognito User to check if custom attributes / registration number are populated
    console.log('\nFetching updated Cognito user profile...');
    const userRes = await client.send(new AdminGetUserCommand({
      UserPoolId: conf.COGNITO_USER_POOL_ID,
      Username: email
    }));
    console.log('\nCognito User Attributes:');
    if (userRes && userRes.UserAttributes) {
      console.log(JSON.stringify(userRes.UserAttributes, null, 2));
      const regAttr = userRes.UserAttributes.find(attr => attr.Name === 'custom:registration_no');
      if (regAttr) {
        console.log(`\n🎉 Success! custom:registration_no attribute is set to: "${regAttr.Value}"`);
      } else {
        console.log('\n⚠️ Warning: custom:registration_no attribute is NOT found in Cognito yet. (Post-confirmation trigger might still be running or failed).');
      }
    }

    // 3. Check if local database record was synced by postConfirmation trigger
    console.log('\nChecking local database for user sync (waiting 3 seconds for trigger to complete)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

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
      console.log('⚠️ Warning: User record not found in local DB. Check postConfirmation Lambda trigger execution logs.');
    }

  } catch (err: any) {
    console.error('Admin confirmation failed:', err.message);
  } finally {
    await closeDb();
  }
}

run();
