const { CognitoIdentityProviderClient, DescribeUserPoolCommand, UpdateUserPoolCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function run() {
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: COGNITO_USER_POOL_ID is not defined.');
    process.exit(1);
  }

  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

  try {
    console.log(`1. Describing current User Pool configuration for: ${COGNITO_USER_POOL_ID}`);
    const describeRes = await client.send(new DescribeUserPoolCommand({
      UserPoolId: COGNITO_USER_POOL_ID
    }));

    const pool = describeRes.UserPool;
    console.log('Current AutoVerifiedAttributes:', pool.AutoVerifiedAttributes);

    console.log('2. Updating User Pool to set AutoVerifiedAttributes to ["email"]...');

    const updateCommand = new UpdateUserPoolCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      AutoVerifiedAttributes: ['email'],
      
      // Copy existing settings to avoid overwriting them with defaults
      Policies: pool.Policies,
      LambdaConfig: pool.LambdaConfig,
      VerificationMessageTemplate: pool.VerificationMessageTemplate,
      EmailConfiguration: pool.EmailConfiguration,
      SmsConfiguration: pool.SmsConfiguration,
      UserAttributeUpdateSettings: pool.UserAttributeUpdateSettings,
      DeviceConfiguration: pool.DeviceConfiguration,
      AdminCreateUserConfig: pool.AdminCreateUserConfig,
    });

    const updateRes = await client.send(updateCommand);
    console.log('🎉 SUCCESS! User Pool configuration updated successfully!');
    console.log('New AutoVerifiedAttributes:', updateRes.$metadata.httpStatusCode === 200 ? '["email"]' : 'failed');
  } catch (err) {
    console.error('❌ Failed to update Cognito User Pool:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

run();
