const { CognitoIdentityProviderClient, DescribeUserPoolCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function checkConfig() {
  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

  try {
    const command = new DescribeUserPoolCommand({
      UserPoolId: COGNITO_USER_POOL_ID
    });

    const response = await client.send(command);
    console.log('=== User Pool Details ===');
    console.log(JSON.stringify(response.UserPool, null, 2));
  } catch (err) {
    console.error('Failed to describe user pool:', err.message);
  }
}

checkConfig();
