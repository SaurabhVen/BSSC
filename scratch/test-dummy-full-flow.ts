import { 
  CognitoIdentityProviderClient, 
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand 
} from '@aws-sdk/client-cognito-identity-provider';
import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const clientId = process.env.COGNITO_CLIENT_ID || '4kd4ni8ebhhu4l0v3iv0rl2prm';
const userPoolId = process.env.COGNITO_USER_POOL_ID || 'ap-south-1_nUUpexOF8';
const region = process.env.AWS_REGION || 'ap-south-1';
const baseUrl = 'http://127.0.0.1:3000';

async function request(path: string, method: string, body: any, token: string) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as any;
  return { status: res.status, data };
}

async function main() {
  console.log('=== STARTING END-TO-END DUMMY USER FLOW TEST (STEPS 0 TO 5) ===\n');

  const randomId = Math.floor(100000 + Math.random() * 900000);
  const email = `bssc_dummy_user_${randomId}@example.com`;
  const password = 'Password@12345';
  const phone = `+919${Math.floor(100000000 + Math.random() * 900000000)}`;

  console.log(`[Step 0 - Registration] Initializing registration for user:`);
  console.log(`Email: ${email}`);
  console.log(`Phone: ${phone}`);
  console.log(`Password: ${password}`);

  const cognitoClient = new CognitoIdentityProviderClient({ region });

  // 1. Sign up user on Cognito (Simulating step 0 signup)
  console.log('Signing up user via Cognito SignUpCommand...');
  const cognitoAttrs = [
    { Name: 'name', Value: 'Dummy Candidate' },
    { Name: 'given_name', Value: 'Dummy' },
    { Name: 'family_name', Value: 'Candidate' },
    { Name: 'email', Value: email },
    { Name: 'phone_number', Value: phone },
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
    { Name: 'custom:mobile_no', Value: phone.replace(/^\+91/, '') }
  ];

  const signUpCommand = new SignUpCommand({
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: cognitoAttrs,
  });

  const signUpRes = await cognitoClient.send(signUpCommand);
  console.log('✅ SignUp response received:', signUpRes.UserSub);

  // 2. Admin confirm user
  console.log('\nConfirming user signup via AdminConfirmSignUpCommand...');
  const confirmCommand = new AdminConfirmSignUpCommand({
    UserPoolId: userPoolId,
    Username: email,
  });
  await cognitoClient.send(confirmCommand);
  console.log('✅ User registration confirmed successfully by Admin!');

  // 3. Retrieve application ID from local database
  console.log('\nWaiting for Cognito PostConfirmation trigger to sync database records (polling DB)...');
  const db = getDb();
  let dbUser: any = null;
  let dbCandidate: any = null;
  let dbApplication: any = null;

  for (let i = 0; i < 15; i++) {
    console.log(`Polling DB attempt ${i+1}/15...`);
    dbUser = await db.select().from(users).where(eq(users.email, email)).limit(1).then(r => r[0]);
    if (dbUser) {
      dbCandidate = await db.select().from(candidates).where(eq(candidates.userId, dbUser.id)).limit(1).then(r => r[0]);
      if (dbCandidate) {
        dbApplication = await db.select().from(applications).where(eq(applications.candidateId, dbCandidate.id)).limit(1).then(r => r[0]);
        if (dbApplication) {
          break;
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!dbApplication) {
    throw new Error('Timeout waiting for database sync. Check postConfirmation lambda trigger logs.');
  }

  const applicationId = dbApplication.id;
  console.log('✅ Database sync complete!');
  console.log(`User ID (Cognito Sub): ${dbUser.id}`);
  console.log(`Candidate ID: ${dbCandidate.id}`);
  console.log(`Application ID: ${applicationId}`);
  console.log(`Registration No: ${dbCandidate.registrationNumber}`);

  // 4. Log in to get fresh token
  console.log('\nLogging in to obtain Access Token...');
  const authCommand = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const authResponse = await cognitoClient.send(authCommand);
  if (!authResponse.AuthenticationResult?.AccessToken) {
    throw new Error('Authentication failed - no access token returned!');
  }
  const token = authResponse.AuthenticationResult.AccessToken;
  console.log('✅ Access Token retrieved successfully.');

  // 5. Step 1: Save Personal Info (Backend step 0)
  console.log('\n[Test 1] Saving Step 1: Candidate Personal Info...');
  const step1Payload = {
    fullName: "Dummy Candidate",
    fatherName: "Test Father Name",
    motherName: "Test Mother Name",
    dateOfBirth: "16-10-1999",
    gender: "male",
    maritalStatus: "unmarried",
    nationality: "Indian",
    identityType: "aadhaar",
    identityNumber: "123456789012",
    identificationMark1: "Mole on right cheek",
    identificationMark2: "",
    mobileNumber: phone.replace(/^\+91/, ''),
    alternateNumber: "",
    emailId: email,
    address: {
      permanent: {
        street: "123 Test Street",
        post: "Test Post",
        district: "Patna",
        city: "Patna",
        state: "Bihar",
        pincode: "800001",
        country: "India"
      },
      correspondence: {
        sameAsPermanent: true
      }
    }
  };
  const step1Res = await request(`/api/v1/application/${applicationId}/step/0`, 'POST', step1Payload, token);
  console.log(`Step 1 Response Status: ${step1Res.status}`);
  console.log('Step 1 Response:', JSON.stringify(step1Res.data, null, 2));
  if (step1Res.status !== 200 || !step1Res.data.success) {
    throw new Error('Step 1 test failed!');
  }

  // 6. Step 2: Payment (Initiate & Verify)
  console.log('\n[Test 2] Initiating Step 2: Payment...');
  const payInitRes = await request('/api/v1/payment/initiate', 'POST', { applicationId }, token);
  console.log(`Payment Initiate Status: ${payInitRes.status}`);
  console.log('Payment Initiate Response:', JSON.stringify(payInitRes.data, null, 2));
  if ((payInitRes.status !== 200 && payInitRes.status !== 201) || !payInitRes.data.success) {
    throw new Error('Payment initiation failed!');
  }

  console.log('\n[Test 2.1] Verifying Step 2: Payment...');
  const orderId = payInitRes.data.data.paymentOrderId;
  const payVerifyRes = await request('/api/v1/payment/verify', 'POST', {
    paymentOrderId: orderId,
    getepayPaymentId: orderId,
    transactionId: 'txn_mock_' + Date.now(),
    paymentMode: 'online',
    bankName: 'Test Bank',
    amount: payInitRes.data.data.amount,
  }, token);
  console.log(`Payment Verify Status: ${payVerifyRes.status}`);
  console.log('Payment Verify Response:', JSON.stringify(payVerifyRes.data, null, 2));
  if (payVerifyRes.status !== 200 || !payVerifyRes.data.success) {
    throw new Error('Payment verification failed!');
  }

  // 7. Step 3: Education (Backend step 2)
  console.log('\n[Test 3] Saving Step 3: Education Qualifications...');
  const step3Payload = {
    highestQualification: "graduation",
    qualifications: [
      {
        level: "matriculation",
        boardUniversity: "CBSE",
        institutionName: "Test School",
        degree: "10th",
        specialization: "General",
        rollNumber: "1234567",
        yearOfPassing: 2015,
        totalMarks: 500,
        marksObtained: 450,
        percentage: 90,
        grade: "A"
      },
      {
        level: "graduation",
        boardUniversity: "Patna University",
        institutionName: "Science College",
        degree: "B.Sc",
        specialization: "Physics",
        rollNumber: "987654",
        yearOfPassing: 2020,
        totalMarks: 1000,
        marksObtained: 850,
        percentage: 85,
        grade: "A"
      }
    ]
  };
  const step3Res = await request(`/api/v1/application/${applicationId}/step/2`, 'POST', step3Payload, token);
  console.log(`Step 3 Response Status: ${step3Res.status}`);
  console.log('Step 3 Response:', JSON.stringify(step3Res.data, null, 2));
  if (step3Res.status !== 200 || !step3Res.data.success) {
    throw new Error('Step 3 test failed!');
  }

  // 8. Step 4: Photo & Signature (Backend step 4)
  console.log('\n[Test 4] Saving Step 4: Photo & Signature...');
  const step4Payload = {
    photograph: "ae5016c6-947b-402a-96e0-ca469b9ee32e",
    signatureEnglish: "48f6d78f-9193-4fad-896d-842c09806ee7",
    signatureHindi: "fc05f384-ab4d-4f8f-83b6-5f008a9e4086"
  };
  const step4Res = await request(`/api/v1/application/${applicationId}/step/4`, 'POST', step4Payload, token);
  console.log(`Step 4 Response Status: ${step4Res.status}`);
  console.log('Step 4 Response:', JSON.stringify(step4Res.data, null, 2));
  if (step4Res.status !== 200 || !step4Res.data.success) {
    throw new Error('Step 4 test failed!');
  }

  // 9. Step 5: Live Photo (Backend step 5)
  console.log('\n[Test 5] Saving Step 5: Live Photo...');
  const step5Payload = {
    livePhoto: "92ffc9af-1ff6-4dce-835a-9b8fef102293"
  };
  const step5Res = await request(`/api/v1/application/${applicationId}/step/5`, 'POST', step5Payload, token);
  console.log(`Step 5 Response Status: ${step5Res.status}`);
  console.log('Step 5 Response:', JSON.stringify(step5Res.data, null, 2));
  if (step5Res.status !== 200 || !step5Res.data.success) {
    throw new Error('Step 5 test failed!');
  }

  // 10. Fetch and verify final state
  console.log('\n[Verification] Fetching all steps data to verify final status...');
  const stepsRes = await request(`/api/v1/application/${applicationId}/steps`, 'GET', null, token);
  console.log(`Get Steps Status: ${stepsRes.status}`);
  console.log('Completed Steps array in response:', stepsRes.data?.data?.completedSteps);
  console.log('Current Step in response:', stepsRes.data?.data?.currentStep);

  console.log('\n==================================================');
  console.log('🎉 SUCCESS: END-TO-END TEST FROM STEP 0 TO 5 PASSED FOR DUMMY CANDIDATE!');
  console.log(`Dummy Email: ${email}`);
  console.log(`Registration No: ${dbCandidate.registrationNumber}`);
  console.log('==================================================\n');
}

main()
  .catch(err => {
    console.error('\n❌ TEST RUN ENCOUNTERED FAILURE:', err);
  })
  .finally(async () => {
    await closeDb();
  });
