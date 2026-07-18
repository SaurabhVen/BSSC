const { CognitoIdentityProviderClient, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function run() {
  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

  const command = new AdminSetUserPasswordCommand({
    UserPoolId: COGNITO_USER_POOL_ID,
    Username: 'BSSC2026635065018',
    Password: 'TestPass123!',
    Permanent: true
  });

  try {
    console.log('Setting permanent password for BSSC2026635065018 to "TestPass123!"...');
    await client.send(command);
    console.log('✅ Password set successfully!');
  } catch (err) {
    console.error('❌ Failed to set password:', err.message);
  }
}

run();
