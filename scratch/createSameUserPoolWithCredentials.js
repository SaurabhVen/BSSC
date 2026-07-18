const {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand
} = require('@aws-sdk/client-cognito-identity-provider');

// Standalone AWS Credentials populated directly into the script
const AWS_REGION = 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'PLACEHOLDER_AWS_ACCESS_KEY_ID';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'PLACEHOLDER_AWS_SECRET_ACCESS_KEY';

const client = new CognitoIdentityProviderClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Custom attributes schema definition
const customAttributes = [
  { Name: 'registration_no', AttributeDataType: 'String', Mutable: true },
  { Name: 'registration_number', AttributeDataType: 'String', Mutable: true },
  { Name: 'bihar_domicile', AttributeDataType: 'String', Mutable: true },
  { Name: 'mobile_no', AttributeDataType: 'String', Mutable: true },
  { Name: 'category', AttributeDataType: 'String', Mutable: true },
  { Name: 'caste', AttributeDataType: 'String', Mutable: true },
  { Name: 'non_creamy_layer', AttributeDataType: 'String', Mutable: true },
  { Name: 'is_pwd', AttributeDataType: 'String', Mutable: true },
  { Name: 'disability_type', AttributeDataType: 'String', Mutable: true },
  { Name: 'pwd_40_percent', AttributeDataType: 'String', Mutable: true },
  { Name: 'ex_serviceman', AttributeDataType: 'String', Mutable: true },
  { Name: 'service_period', AttributeDataType: 'String', Mutable: true },
  { Name: 'bihar_govt_emp', AttributeDataType: 'String', Mutable: true },
  { Name: 'bssc_attempts', AttributeDataType: 'String', Mutable: true },
  { Name: 'contractual_emp', AttributeDataType: 'String', Mutable: true },
  { Name: 'post_name', AttributeDataType: 'String', Mutable: true },
  { Name: 'has_agreement', AttributeDataType: 'String', Mutable: true },
  { Name: 'contractual_period', AttributeDataType: 'String', Mutable: true },
  { Name: 'officer_type', AttributeDataType: 'String', Mutable: true },
  { Name: 'category_cert_no', AttributeDataType: 'String', Mutable: true },
  { Name: 'cat_cert_issue_dt', AttributeDataType: 'String', Mutable: true },
  { Name: 'cat_cert_auth', AttributeDataType: 'String', Mutable: true },
  { Name: 'cat_cert_auth_oth', AttributeDataType: 'String', Mutable: true },
  { Name: 'disability_cert_no', AttributeDataType: 'String', Mutable: true },
  { Name: 'dis_cert_issue_dt', AttributeDataType: 'String', Mutable: true },
  { Name: 'dis_cert_auth', AttributeDataType: 'String', Mutable: true },
  { Name: 'dis_cert_auth_oth', AttributeDataType: 'String', Mutable: true },
  { Name: 'is_scribe_required', AttributeDataType: 'String', Mutable: true },
  { Name: 'dis_type_persist', AttributeDataType: 'String', Mutable: true },
  { Name: 'organization_name', AttributeDataType: 'String', Mutable: true },
  { Name: 'has_post_experience', AttributeDataType: 'String', Mutable: true },
];

async function createPool() {
  const poolName = `candidate-portal-pool-${Date.now()}`;
  const clientName = `candidate-portal-client-${Date.now()}`;

  try {
    console.log(`🚀 Step 1: Creating Cognito User Pool "${poolName}" with configuration...`);
    const createUserPoolCommand = new CreateUserPoolCommand({
      PoolName: poolName,
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
        },
      },
      Schema: customAttributes,
    });

    const poolResponse = await client.send(createUserPoolCommand);
    const userPoolId = poolResponse.UserPool.Id;
    console.log(`✅ User Pool created successfully! UserPoolId: ${userPoolId}`);

    console.log(`🚀 Step 2: Creating App Client "${clientName}"...`);
    const createClientCommand = new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: clientName,
      GenerateSecret: false,
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_ADMIN_USER_PASSWORD_AUTH',
      ],
    });

    const clientResponse = await client.send(createClientCommand);
    const clientId = clientResponse.UserPoolClient.ClientId;
    console.log(`✅ App Client created successfully! ClientId: ${clientId}`);

    console.log('\n======================================================');
    console.log('🎉 SUCCESSFULLY CREATED BOTH USER POOL AND APP CLIENT!');
    console.log('======================================================');
    console.log(`Please copy these values into your .env file:`);
    console.log(`COGNITO_USER_POOL_ID=${userPoolId}`);
    console.log(`COGNITO_CLIENT_ID=${clientId}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Failed to create User Pool or Client:', error);
  }
}

createPool();
