/**
 * Test Saurabh Email Script
 * -------------------------
 * 1. Safely deletes saurabh@vensysco.in from Cognito and PostgreSQL DB (if exists).
 * 2. Registers saurabh@vensysco.in in Cognito.
 * 3. Admin confirms saurabh@vensysco.in in Cognito (which triggers PostConfirmation Lambda).
 * 4. Verifies the result.
 */

const {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  SignUpCommand,
  AdminConfirmSignUpCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const DATABASE_URL = process.env.DATABASE_URL;

const TEST_EMAIL = 'saurabh@vensysco.in';

async function run() {
  console.log('============================================================');
  console.log(`📧 TESTING REGISTRATION EMAIL FOR: ${TEST_EMAIL}`);
  console.log('============================================================\n');

  // 1. Delete from PostgreSQL Database first so confirmation trigger behaves as a new registration
  const dbClient = new Client({ connectionString: DATABASE_URL });
  try {
    await dbClient.connect();
    console.log('🗄️  Connected to PostgreSQL Database.');

    // Find user ID
    const userRes = await dbClient.query('SELECT id FROM users WHERE email = $1', [TEST_EMAIL]);
    if (userRes.rows.length > 0) {
      const userId = userRes.rows[0].id;
      console.log(`🗑️  Found user in DB (ID: ${userId}). Deleting associated candidate and user records...`);
      
      // Delete from dependent tables
      await dbClient.query('DELETE FROM candidate_languages WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = $1)', [userId]);
      await dbClient.query('DELETE FROM candidate_post_preferences WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = $1)', [userId]);
      await dbClient.query('DELETE FROM candidate_qualifications WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = $1)', [userId]);
      await dbClient.query('DELETE FROM documents WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = $1)', [userId]);
      await dbClient.query('DELETE FROM payments WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = $1)', [userId]);
      await dbClient.query('DELETE FROM applications WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = $1)', [userId]);
      await dbClient.query('DELETE FROM candidates WHERE user_id = $1', [userId]);
      await dbClient.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log('   ✅ Deleted from PostgreSQL database.');
    } else {
      console.log('ℹ️  User not found in PostgreSQL database. No deletion needed.');
    }
  } catch (err) {
    console.warn('⚠️  Database cleanup warning:', err.message);
  } finally {
    await dbClient.end();
  }

  // 2. Delete from Cognito User Pool
  const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
  try {
    console.log(`🗑️  Deleting ${TEST_EMAIL} from Cognito (if exists)...`);
    await cognitoClient.send(new AdminDeleteUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: TEST_EMAIL,
    }));
    console.log('   ✅ Deleted from Cognito.');
  } catch (err) {
    if (err.name === 'UserNotFoundException') {
      console.log('ℹ️  User not found in Cognito User Pool. No deletion needed.');
    } else {
      console.warn('⚠️  Cognito cleanup warning:', err.message);
    }
  }

  // 3. Register user in Cognito
  console.log(`\n1️⃣  Registering user in Cognito: ${TEST_EMAIL}`);
  try {
    const signup = await cognitoClient.send(new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: TEST_EMAIL,
      Password: 'TestPass123!',
      UserAttributes: [
        { Name: 'email', Value: TEST_EMAIL },
        { Name: 'name', Value: 'Saurabh Vensysco' },
        { Name: 'gender', Value: 'MALE' },
        { Name: 'birthdate', Value: '1995-01-01' },
        { Name: 'custom:mobile_no', Value: '9999999999' },
        { Name: 'custom:category', Value: 'UR' },
        { Name: 'custom:caste', Value: 'GENERIC_CAST' },
        { Name: 'custom:bihar_domicile', Value: 'NO' },
        { Name: 'custom:is_pwd', Value: 'NO' },
        { Name: 'custom:disability_type', Value: 'TEMPORARY' },
        { Name: 'custom:pwd_40_percent', Value: 'NO' },
        { Name: 'custom:ex_serviceman', Value: 'NO' },
        { Name: 'custom:ncc_cadet', Value: 'NO' },
        { Name: 'custom:bihar_govt_emp', Value: 'NO' },
        { Name: 'custom:bssc_attempts', Value: '1' },
        { Name: 'custom:contractual_emp', Value: 'NO' },
        { Name: 'custom:non_creamy_layer', Value: 'NO' },
      ],
    }));
    console.log(`   ✅ User created in Cognito. Sub: ${signup.UserSub}`);

    // 4. Admin confirm user (triggers PostConfirmation Lambda)
    console.log('2️⃣  Admin confirming user (triggers PostConfirmation Lambda)...');
    await cognitoClient.send(new AdminConfirmSignUpCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: TEST_EMAIL,
    }));
    console.log('   ✅ User confirmed.');

    console.log('\n3️⃣  Waiting 7 seconds for Lambda trigger to complete and send email...');
    await new Promise(resolve => setTimeout(resolve, 7000));

    console.log('\n============================================================');
    console.log(`🎉 TEST STARTED! Please check your mailbox: ${TEST_EMAIL}`);
    console.log('📋 Check CloudWatch logs for verification:');
    console.log('   npx ts-node scratch/get_lambda_logs.ts');
    console.log('============================================================');

  } catch (err) {
    console.error('❌ Registration/Confirmation failed:', err.message);
  }
}

run();
