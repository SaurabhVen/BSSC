const { CognitoIdentityProviderClient, AddCustomAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const customAttributes = [
  { Name: 'registration_no', AttributeDataType: 'String', Mutable: true }
];

async function run() {
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: COGNITO_USER_POOL_ID is not configured in your .env file.');
    process.exit(1);
  }

  console.log(`Starting to add custom:registration_no attribute to User Pool: ${COGNITO_USER_POOL_ID} in region ${AWS_REGION}`);

  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

  try {
    const command = new AddCustomAttributesCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      CustomAttributes: customAttributes
    });

    const response = await client.send(command);
    console.log('Successfully added custom attribute to Cognito User Pool!', JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('Failed to add custom attribute:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

run();
