process.env.MOCK_SMS_EMAIL = 'false';

import { handler } from '../src/handlers/auth/customSmsSender';
import { CustomSMSSenderTriggerEvent, Context } from 'aws-lambda';
import config from '../src/config';

// Mock Cognito Custom SMS Sender Event Payload
const plaintextOtp = '556677';
const base64Code = Buffer.from(plaintextOtp).toString('base64');

const mockEvent = {
  version: '1',
  triggerSource: 'CustomSMSSender_SignUp',
  region: config.AWS_REGION,
  userPoolId: 'ap-south-1_mockPoolId',
  userName: 'test_candidate',
  callerContext: {
    awsSdkVersion: 'aws-sdk-js-v3',
    clientId: 'mockClientId123'
  },
  request: {
    userAttributes: {
      phone_number: '+919026784051'
    },
    code: base64Code
  }
} as unknown as CustomSMSSenderTriggerEvent;

const context = {} as Context;

const runTest = async () => {
  console.log('--- Testing Custom SMS Sender Trigger locally ---');
  console.log(`Current MOCK_SMS_EMAIL state: ${config.MOCK_SMS_EMAIL}`);
  console.log(`Target Phone: ${mockEvent.request.userAttributes?.phone_number}`);
  console.log(`Plaintext OTP: ${plaintextOtp}`);

  try {
    const response = await handler(mockEvent, context);
    console.log('\nTrigger execution successful!');
    console.log('Result:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('\nTrigger execution failed:', error);
  }
};

runTest();
