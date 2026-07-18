import { CognitoIdentityProviderClient, SignUpCommand, AdminConfirmSignUpCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });

async function run() {
  const email = `test_trigger_${Date.now()}@example.com`;
  console.log(`1. Registering user on Cognito: ${email}`);

  try {
    const signup = await cognitoClient.send(new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      Password: 'Password123!',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: 'AWS Trigger Test' },
        { Name: 'gender', Value: 'MALE' },
        { Name: 'birthdate', Value: '1995-05-15' },
        { Name: 'custom:bihar_domicile', Value: 'NO' },
        { Name: 'custom:mobile_no', Value: '9999988888' },
        { Name: 'custom:category', Value: 'UR' },
        { Name: 'custom:caste', Value: 'GENERIC_CAST' },
        { Name: 'custom:non_creamy_layer', Value: 'NO' },
        { Name: 'custom:is_pwd', Value: 'NO' },
        { Name: 'custom:disability_type', Value: 'TEMPORARY' },
        { Name: 'custom:pwd_40_percent', Value: 'NO' },
        { Name: 'custom:ex_serviceman', Value: 'NO' },
        { Name: 'custom:ncc_cadet', Value: 'NO' },
        { Name: 'custom:bihar_govt_emp', Value: 'NO' },
        { Name: 'custom:bssc_attempts', Value: '1' },
        { Name: 'custom:contractual_emp', Value: 'NO' }
      ]
    }));

    const userSub = signup.UserSub;
    console.log(`User created on Cognito with Sub ID: ${userSub}`);

    console.log('2. Admin confirming user to trigger PostConfirmation on AWS...');
    await cognitoClient.send(new AdminConfirmSignUpCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: email
    }));
    console.log('User confirmed successfully.');

    console.log('3. Waiting 6 seconds for Lambda execution and DB sync...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    console.log('4. Checking database for the new user...');
    const { getDb, closeDb } = require('../src/database/drizzle');
    const { users, candidates } = require('../src/database/schema');
    const { eq } = require('drizzle-orm');

    const db = getDb();
    const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userRows.length > 0) {
      console.log('🎉 SUCCESS! User found in DB:', JSON.stringify(userRows[0], null, 2));
      const candidateRows = await db.select().from(candidates).where(eq(candidates.userId, userRows[0].id)).limit(1);
      if (candidateRows.length > 0) {
        console.log('🎉 SUCCESS! Candidate found in DB:', JSON.stringify(candidateRows[0], null, 2));
      } else {
        console.error('❌ Candidate record not found in DB.');
      }
      
      // Clean up local database
      await db.delete(candidates).where(eq(candidates.userId, userRows[0].id));
      await db.delete(users).where(eq(users.id, userRows[0].id));
      console.log('Deleted temporary database records.');
    } else {
      console.error('❌ User not found in DB. DB sync failed.');
    }
    closeDb();

    console.log('5. Cleaning up Cognito...');
    await cognitoClient.send(new AdminDeleteUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: email
    }));
    console.log('Cognito user deleted.');

  } catch (err: any) {
    console.error('Test failed with error:', err.message);
  }
}

run();
