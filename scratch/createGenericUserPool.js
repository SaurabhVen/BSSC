const { 
  CognitoIdentityProviderClient, 
  CreateUserPoolCommand, 
  CreateUserPoolClientCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

// =========================================================================
// ⚙️ CONFIGURATION FOR YOUR NEW PROJECT (EDIT THESE FOR OTHER PROJECTS)
// =========================================================================
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const USER_POOL_NAME = 'my-new-project-user-pool'; // Change User Pool Name here
const APP_CLIENT_NAME = 'my-new-project-app-client'; // Change App Client Name here

// 📝 Add, remove, or modify your new custom attributes here.
// Note: Required is set to false (not required) and Mutable is true (editable).
const customAttributes = [
  { Name: 'registration_no', AttributeDataType: 'String', Mutable: true },
  { Name: 'organization_id', AttributeDataType: 'String', Mutable: true },
  { Name: 'department', AttributeDataType: 'String', Mutable: true },
  { Name: 'user_role', AttributeDataType: 'String', Mutable: true },
  // Add any other attributes here...
];
// =========================================================================

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey || accessKeyId === 'mock-access-key-id') {
  console.error('❌ Error: Valid AWS credentials (AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY) must be set in .env.');
  process.exit(1);
}

const client = new CognitoIdentityProviderClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function createGenericUserPool() {
  try {
    console.log(`🚀 Step 1: Creating Cognito User Pool "${USER_POOL_NAME}" in region "${AWS_REGION}"...`);
    const createUserPoolCommand = new CreateUserPoolCommand({
      PoolName: USER_POOL_NAME,
      
      // Allows login using Email OR Registration Number (preferred_username)
      AliasAttributes: ['email', 'preferred_username'],
      AutoVerifiedAttributes: ['email'],
      
      // Strict password policy (8 chars, Upper, Lower, Numbers, Symbols)
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
        },
      },
      
      // Injecting custom attributes
      Schema: customAttributes.map(attr => ({
        ...attr,
        Required: false, // Ensures none of them are required
      })),
    });

    const poolResponse = await client.send(createUserPoolCommand);
    const userPoolId = poolResponse.UserPool.Id;
    console.log(`✅ User Pool created successfully! UserPoolId: ${userPoolId}`);

    console.log(`🚀 Step 2: Creating App Client "${APP_CLIENT_NAME}"...`);
    const createClientCommand = new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: APP_CLIENT_NAME,
      GenerateSecret: false, // No secret (ideal for web/mobile applications)
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_ADMIN_USER_PASSWORD_AUTH',
      ],
    });

    const clientResponse = await client.send(createClientCommand);
    const clientId = clientResponse.UserPoolClient.ClientId;

    console.log('\n======================================================');
    console.log('🎉 COGNITO USER POOL & CLIENT CREATED FOR NEW PROJECT!');
    console.log('======================================================');
    console.log(`COGNITO_USER_POOL_ID=${userPoolId}`);
    console.log(`COGNITO_CLIENT_ID=${clientId}`);
    console.log('======================================================\n');
    console.log('You can now copy the output above to your other project\'s .env file.');
  } catch (error) {
    console.error('❌ Failed to create Cognito resources:', error);
  }
}

createGenericUserPool();
