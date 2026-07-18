import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand 
} from '@aws-sdk/client-cognito-identity-provider';
import dotenv from 'dotenv';
dotenv.config();

const client = new CognitoIdentityProviderClient({ region: 'ap-south-1' });
const username = 'saurabh+9@vensysco.in';
const password = 'Password@12345';
const clientId = process.env.COGNITO_CLIENT_ID || '4kd4ni8ebhhu4l0v3iv0rl2prm';
const applicationId = '0b935ecc-5543-4107-b71b-b4f737d04b8c';
const baseUrl = 'http://127.0.0.1:3000';

async function loginUser() {
  console.log(`[Auth] Logging in candidate: ${username}...`);
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  const response = await client.send(command);
  if (!response.AuthenticationResult?.AccessToken) {
    throw new Error('Authentication failed - no access token returned!');
  }
  return response.AuthenticationResult.AccessToken;
}

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
  console.log('=== STARTING STEPS 0 TO 5 END-TO-END FLOW TEST ===\n');

  // Log in to get fresh token
  const token = await loginUser();
  console.log('✅ Authentication successful! Token retrieved.\n');

  // Step 1: Save Personal Info (Backend step 0)
  console.log('[Test 1] Saving Step 1: Candidate Personal Info...');
  const step1Payload = {
    fullName: "Saurabh Mishra",
    fatherName: "Father Name",
    motherName: "Mother Name",
    dateOfBirth: "16-10-1999",
    gender: "male",
    maritalStatus: "unmarried",
    nationality: "Indian",
    identityType: "aadhaar",
    identityNumber: "123456789012",
    identificationMark1: "Mole on right cheek",
    identificationMark2: "",
    mobileNumber: "8382044417",
    alternateNumber: "",
    emailId: "saurabh+9@vensysco.in",
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

  // Step 2: Payment (Initiate & Verify)
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
    razorpayOrderId: orderId,
    razorpayPaymentId: 'pay_mock_' + Date.now(),
    razorpaySignature: 'sig_mock_123',
  }, token);
  console.log(`Payment Verify Status: ${payVerifyRes.status}`);
  console.log('Payment Verify Response:', JSON.stringify(payVerifyRes.data, null, 2));
  if (payVerifyRes.status !== 200 || !payVerifyRes.data.success) {
    throw new Error('Payment verification failed!');
  }

  // Step 3: Education (Backend step 2)
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

  // Step 4: Photo & Signature (Backend step 4)
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

  // Step 5: Live Photo (Backend step 5)
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

  console.log('\n==================================================');
  console.log('🎉 SUCCESS: ALL STEPS 1 TO 5 EXECUTE AND SAVE CORRECTLY!');
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('\n❌ TEST RUN ENCOUNTERED FAILURE:', err);
});
