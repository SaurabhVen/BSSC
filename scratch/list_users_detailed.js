const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function listUsers() {
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: COGNITO_USER_POOL_ID is not configured.');
    process.exit(1);
  }

  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });
  
  try {
    const response = await client.send(new ListUsersCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Limit: 60
    }));

    console.log('--- Cognito Users ---');
    for (const user of response.Users || []) {
      const email = user.Attributes.find(a => a.Name === 'email')?.Value;
      const regNo = user.Attributes.find(a => a.Name === 'custom:registration_no')?.Value;
      console.log(`Username: ${user.Username} | Email: ${email} | Status: ${user.UserStatus} | RegNo: ${regNo || 'None'}`);
    }
  } catch (err) {
    console.error('Failed to list users:', err.message);
  }
}

listUsers();
