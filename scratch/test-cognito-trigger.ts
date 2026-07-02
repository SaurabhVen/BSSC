import { handler } from '../src/handlers/auth/customMessage';

const mockEvent = {
  version: '1',
  region: 'ap-south-1',
  userPoolId: 'ap-south-1_mock',
  userName: 'testuser',
  callerContext: {
    awsSdkVersion: 'aws-sdk-js-2.1000.0',
    clientId: 'mockClientId'
  },
  request: {
    userAttributes: {
      email: 'test@example.com',
      name: 'John Doe',
      'custom:applicationNo': 'APP123456789'
    },
    codeParameter: '123456',
    usernameParameter: 'testuser'
  },
  response: {
    smsMessage: null,
    emailMessage: null,
    emailSubject: null
  }
};

const runTests = async () => {
  const triggerSources = [
    'CustomMessage_SignUp',
    'CustomMessage_AdminCreateUser',
    'CustomMessage_ForgotPassword',
    'CustomMessage_MFA',
    'CustomMessage_Authentication'
  ];

  for (const source of triggerSources) {
    const event = { ...mockEvent, triggerSource: source };
    
    // Using a promise to wrap the callback execution
    await new Promise((resolve) => {
      handler(event as any, {} as any, (err, result: any) => {
        console.log(`\n=== Test: ${source} ===`);
        console.log('Subject:', result.response.emailSubject);
        console.log('SMS Message:', result.response.smsMessage);
        console.log('-----------------------------------');
        resolve(true);
      });
    });
  }
};

runTests();
