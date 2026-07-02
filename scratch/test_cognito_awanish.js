const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function run() {
  if (!COGNITO_USER_POOL_ID) {
    console.log('Cognito User Pool ID not configured.');
    return;
  }
  
  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });
  try {
    const response = await client.send(new ListUsersCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Filter: 'email = "awanish@vensysco.in"'
    }));
    
    if (response.Users && response.Users.length > 0) {
      console.log('User found in Cognito Pool:', JSON.stringify(response.Users[0], null, 2));
    } else {
      console.log('User not found in Cognito Pool.');
    }
  } catch (err) {
    console.error('Cognito search error:', err.message);
  }
}

run();
