const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const invokeLambda = async () => {
  // Let the SDK load credentials from ~/.aws/credentials or environment variables automatically
  const client = new LambdaClient({
    region: process.env.AWS_REGION || 'ap-south-1',
  });

  const randomId = Math.floor(Math.random() * 1000000);
  const dummyEmail = `dummy_user_${randomId}@example.com`;
  const dummySub = 'fa263f97-d86b-45a7-96bf-' + randomId.toString().padStart(12, '0');

  console.log(`Invoking remote Lambda with email: ${dummyEmail}`);

  const event = {
    version: '1',
    region: 'ap-south-1',
    userPoolId: process.env.COGNITO_USER_POOL_ID || 'ap-south-1_nUUpexOF8',
    userName: dummySub,
    triggerSource: 'PostConfirmation_ConfirmSignUp',
    request: {
      userAttributes: {
        sub: dummySub,
        email: dummyEmail,
        email_verified: 'true',
        name: 'Mock Candidate User',
        phone_number: '+919999900000',
        birthdate: '1998-10-25',
        gender: 'male',
        'custom:bihar_domicile': 'YES',
        'custom:category': 'ur',
        'custom:is_pwd': 'YES',
        'custom:ex_serviceman': 'NO',
        'custom:bihar_govt_emp': 'YES',
        'custom:bssc_attempts': '2',
      },
    },
    response: {},
  };

  try {
    const response = await client.send(
      new InvokeCommand({
        FunctionName: 'bssc-dev-postConfirmation',
        Payload: JSON.stringify(event),
      })
    );

    const resultPayload = Buffer.from(response.Payload).toString('utf-8');
    console.log('--- LAMBDA INVOCATION RESULT ---');
    console.log(resultPayload);
  } catch (err) {
    console.error('Failed to invoke Lambda:', err.message);
  }
};

invokeLambda();
