const { CognitoIdentityProviderClient, AddCustomAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

const poolId = process.env.COGNITO_USER_POOL_ID;
const region = process.env.AWS_REGION || 'ap-south-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!poolId || poolId.includes('mockPoolId')) {
  console.error('❌ Please configure COGNITO_USER_POOL_ID in your .env file first.');
  process.exit(1);
}

const client = new CognitoIdentityProviderClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Custom attributes to add (complying with Cognito's strict 20-character name limit)
const attributes = [
  { Name: 'serviceFromDate', AttributeDataType: 'String', Mutable: true },
  { Name: 'serviceToDate', AttributeDataType: 'String', Mutable: true },
  { Name: 'contractualFromDate', AttributeDataType: 'String', Mutable: true }, // 19 chars (<= 20)
  { Name: 'contractualToDate', AttributeDataType: 'String', Mutable: true },   // 17 chars (<= 20)
  { Name: 'isownscribe', AttributeDataType: 'String', Mutable: true },
];

async function run() {
  try {
    console.log(`Adding new custom attributes to User Pool: ${poolId}...`);
    const command = new AddCustomAttributesCommand({
      UserPoolId: poolId,
      CustomAttributes: attributes,
    });
    await client.send(command);
    console.log('✅ Successfully added new custom attributes to the Cognito User Pool!');
  } catch (error) {
    console.error('❌ Failed to add attributes:', error);
  }
}

run();
