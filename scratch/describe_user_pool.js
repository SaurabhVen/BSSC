const { CognitoIdentityProviderClient, DescribeUserPoolCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function run() {
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: COGNITO_USER_POOL_ID is not configured in your .env file.');
    process.exit(1);
  }

  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

  try {
    const command = new DescribeUserPoolCommand({
      UserPoolId: COGNITO_USER_POOL_ID
    });

    const response = await client.send(command);
    const result = {
      Alias: response.UserPool.AliasAttributes || null,
      Username: response.UserPool.UsernameAttributes || null
    };
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Failed to describe user pool:', err.message);
    process.exit(1);
  }
}

run();
