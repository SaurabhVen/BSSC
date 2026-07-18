const { CognitoIdentityProviderClient, AddCustomAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = 'ap-south-1_nUUpexOF8';

const customAttributes = [
  { Name: 'registration_no', AttributeDataType: 'String', Mutable: true }
];

async function run() {
  console.log(`Adding custom:registration_no attribute to User Pool: ${COGNITO_USER_POOL_ID} in region ${REGION}...`);

  const client = new CognitoIdentityProviderClient({ region: REGION });

  try {
    const command = new AddCustomAttributesCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      CustomAttributes: customAttributes
    });

    const response = await client.send(command);
    console.log('\nSUCCESS! Added custom:registration_no attribute to Cognito User Pool!', JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('\nFailed to add custom attribute:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

run();
