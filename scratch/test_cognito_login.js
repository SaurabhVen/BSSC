const { CognitoIdentityProviderClient, InitiateAuthCommand, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

async function run() {
  const usernameOrRegNo = process.argv[2];
  const password = process.argv[3];

  if (!usernameOrRegNo || !password) {
    console.error('Error: Please provide username/regNumber and password as arguments.');
    console.error('Example: node scratch/test_cognito_login.js username password');
    process.exit(1);
  }

  console.log(`Checking Cognito user and login credentials for USERNAME: "${usernameOrRegNo}"...`);

  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

  // 1. Try to login directly
  try {
    const params = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: usernameOrRegNo,
        PASSWORD: password,
      },
    };

    console.log('Sending InitiateAuthCommand (USER_PASSWORD_AUTH)...');
    const command = new InitiateAuthCommand(params);
    const result = await client.send(command);

    console.log('\n✅ SUCCESS! Logged in successfully!');
    console.log('AccessToken:', result.AuthenticationResult.AccessToken.substring(0, 40) + '...');
    console.log('IdToken:', result.AuthenticationResult.IdToken.substring(0, 40) + '...');
    console.log('RefreshToken:', result.AuthenticationResult.RefreshToken.substring(0, 40) + '...');
    return;
  } catch (err) {
    console.log(`❌ Login failed: ${err.message}`);
  }

  // 2. If it failed, let's try to describe or get details for this user to help debug
  console.log('\nAttempting to find user by email/username to check attributes...');
  try {
    const userRes = await client.send(new AdminGetUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: usernameOrRegNo
    }));
    console.log('User found in Cognito! Attributes:');
    console.log(JSON.stringify(userRes.UserAttributes, null, 2));
  } catch (err) {
    console.log(`Failed to fetch user attributes: ${err.message}`);
  }
}

run();
