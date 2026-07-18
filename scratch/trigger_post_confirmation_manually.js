const { handler } = require('../dist/src/handlers/auth/postConfirmation');
const { getCognitoUserByEmail } = require('../dist/src/utils/cognito');
const { getDb, closeDb } = require('../dist/src/database/drizzle');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function triggerConfirmation() {
  const email = 'shivam@vensysco.in';
  console.log(`Fetching Cognito user details for email: ${email}...`);

  const cognitoUser = await getCognitoUserByEmail(email);
  if (!cognitoUser) {
    console.error(`❌ User with email ${email} not found in Cognito.`);
    process.exit(1);
  }

  console.log('Cognito User found:', JSON.stringify(cognitoUser, null, 2));

  // Build PostConfirmationTriggerEvent
  const event = {
    version: '1',
    region: process.env.AWS_REGION || 'ap-south-1',
    userPoolId: COGNITO_USER_POOL_ID,
    userName: cognitoUser.username, // This is the Cognito Username (email or UUID)
    triggerSource: 'PostConfirmation_ConfirmSignUp',
    callerContext: {
      awsSdkVersion: 'aws-sdk-js-3.0.0',
      clientId: process.env.COGNITO_CLIENT_ID || '',
    },
    request: {
      userAttributes: {
        sub: cognitoUser.sub || cognitoUser.username,
        email: email,
        email_verified: String(cognitoUser.email_verified || 'true'),
        birthdate: cognitoUser.birthdate || '2023-02-03',
        name: cognitoUser.name || 'Candidate Name',
        gender: cognitoUser.gender || 'FEMALE',
        'custom:bihar_domicile': cognitoUser['custom:bihar_domicile'] || 'NO',
        'custom:mobile_no': cognitoUser['custom:mobile_no'] || '',
        'custom:category': cognitoUser['custom:category'] || 'UR',
        'custom:caste': cognitoUser['custom:caste'] || '',
        'custom:non_creamy_layer': cognitoUser['custom:non_creamy_layer'] || 'NO',
        'custom:is_pwd': cognitoUser['custom:is_pwd'] || 'NO',
        'custom:disability_type': cognitoUser['custom:disability_type'] || '',
        'custom:pwd_40_percent': cognitoUser['custom:pwd_40_percent'] || 'NO',
        'custom:ex_serviceman': cognitoUser['custom:ex_serviceman'] || 'NO',
        'custom:ncc_cadet': cognitoUser['custom:ncc_cadet'] || 'NO',
        'custom:bihar_govt_emp': cognitoUser['custom:bihar_govt_emp'] || 'NO',
        'custom:bssc_attempts': cognitoUser['custom:bssc_attempts'] || '1',
        'custom:contractual_emp': cognitoUser['custom:contractual_emp'] || 'NO',
        'custom:document_url': cognitoUser['custom:document_url'] || '',
      },
    },
    response: {},
  };

  console.log('Invoking postConfirmation Lambda handler locally...');
  try {
    const result = await handler(event, {});
    console.log('🎉 Lambda handler successfully processed the event!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Failed to run handler:', error);
  } finally {
    closeDb();
  }
}

triggerConfirmation();
