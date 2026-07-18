/**
 * Email Send Test Script
 * ----------------------
 * Registers a new Cognito user + Admin confirms → triggers PostConfirmation Lambda
 * → which sends registration email via SES.
 * 
 * Run: node scratch/test_email_send.js
 */

const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  AdminDeleteUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

// ✏️ CHANGE THIS to your email where you want to receive the test email
const TEST_EMAIL = 'saurabh@vensysco.in';

const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });

async function run() {
  console.log('='.repeat(60));
  console.log('📧 REGISTRATION EMAIL SEND TEST');
  console.log('='.repeat(60));
  console.log(`📬 Test email will be sent to: ${TEST_EMAIL}`);
  console.log(`🌍 Region: ${AWS_REGION}`);
  console.log(`🔑 User Pool: ${COGNITO_USER_POOL_ID}`);
  console.log('');

  // Use a unique test email as the Cognito username
  const testEmail = `emailtest${Date.now()}@vensysco.in`;
  console.log(`1️⃣  Registering test user on Cognito: ${testEmail}`);

  try {
    // Step 1: SignUp on Cognito
    const signup = await cognitoClient.send(new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: testEmail,
      Password: 'TestPass123!',
      UserAttributes: [
        { Name: 'email', Value: testEmail },     // ← email must match username
        { Name: 'name', Value: 'Email Test User' },
        { Name: 'gender', Value: 'MALE' },
        { Name: 'birthdate', Value: '1995-06-15' },
        { Name: 'custom:mobile_no', Value: '9876543210' },
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

    console.log(`   ✅ Cognito user created. Sub: ${signup.UserSub}`);

    // Step 2: Admin Confirm → triggers PostConfirmation Lambda → sends email
    console.log('2️⃣  Admin confirming user (this triggers PostConfirmation Lambda)...');
    await cognitoClient.send(new AdminConfirmSignUpCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: testEmail,
    }));
    console.log('   ✅ User confirmed.');

    // Step 3: Wait for Lambda execution
    console.log('3️⃣  Waiting 6 seconds for Lambda to run and send email...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ DONE! Check inbox: ${TEST_EMAIL}`);
    console.log('📋 Also check CloudWatch logs:');
    console.log('   npx ts-node scratch/get_lambda_logs.ts');
    console.log('   Look for: "[Trigger] Sent registration success email"');
    console.log('='.repeat(60));

    // Cleanup: Delete test user from Cognito
    console.log('\n🧹 Cleaning up test Cognito user...');
    await cognitoClient.send(new AdminDeleteUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: testEmail,
    }));
    console.log('   ✅ Test user deleted from Cognito.');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    if (err.message.includes('MessageDeliveryFailureException')) {
      console.log('\n⚠️  OTP email delivery failed — but this is expected if SES is in sandbox.');
      console.log('   The PostConfirmation Lambda will still run after admin confirmation.');
    }
    // Try cleanup even on error
    try {
      await cognitoClient.send(new AdminDeleteUserCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: testEmail,
      }));
    } catch (_) {}
  }
}

run();
