const { CognitoIdentityProviderClient, CreateUserPoolCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables if credentials are in .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const REGION = 'ap-south-1';
const POOL_NAME = 'BSSC-UserPool';

const client = new CognitoIdentityProviderClient({
  region: REGION,
});

const params = {
  PoolName: POOL_NAME,
  Policies: {
    PasswordPolicy: {
      MinimumLength: 8,
      RequireUppercase: true,
      RequireLowercase: true,
      RequireNumbers: true,
      RequireSymbols: true,
    },
  },
  AliasAttributes: ['preferred_username'],
  AutoVerifiedAttributes: ['email'],
  Schema: [
    {
      Name: 'email',
      AttributeDataType: 'String',
      Mutable: true,
      Required: true,
    },
    {
      Name: 'preferred_username',
      AttributeDataType: 'String',
      Mutable: true,
      Required: false,
    },
  ],
};

async function run() {
  console.log(`Creating user pool "${POOL_NAME}" in region "${REGION}"...`);
  try {
    const command = new CreateUserPoolCommand(params);
    const response = await client.send(command);
    console.log('\nSUCCESS! Cognito User Pool created successfully.');
    console.log('UserPool ID:', response.UserPool.Id);
    console.log('UserPool ARN:', response.UserPool.Arn);
  } catch (err) {
    console.error('\nERROR creating user pool:', err.message || err);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

run();
