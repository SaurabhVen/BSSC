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

// Defining the attributes. 
// Long names (> 20 characters) have been shortened to comply with Cognito's strict 20-character limit.
const attributes = [
  { Name: 'officer_type', AttributeDataType: 'String', Mutable: true },
  { Name: 'category_cert_no', AttributeDataType: 'String', Mutable: true },
  { Name: 'cat_cert_issue_dt', AttributeDataType: 'String', Mutable: true }, // Shortened from category_cert_issue_date
  { Name: 'cat_cert_auth', AttributeDataType: 'String', Mutable: true },     // Shortened from category_cert_authority
  { Name: 'cat_cert_auth_oth', AttributeDataType: 'String', Mutable: true }, // Shortened from category_cert_authority_other
  { Name: 'disability_cert_no', AttributeDataType: 'String', Mutable: true },
  { Name: 'dis_cert_issue_dt', AttributeDataType: 'String', Mutable: true }, // Shortened from disability_cert_issue_date
  { Name: 'dis_cert_auth', AttributeDataType: 'String', Mutable: true },     // Shortened from disability_cert_authority
  { Name: 'dis_cert_auth_oth', AttributeDataType: 'String', Mutable: true }, // Shortened from disability_cert_authority_other
  { Name: 'is_scribe_required', AttributeDataType: 'String', Mutable: true },
  { Name: 'dis_type_persist', AttributeDataType: 'String', Mutable: true },   // Shortened from disability_type_persistent
  { Name: 'organization_name', AttributeDataType: 'String', Mutable: true },
  { Name: 'has_post_experience', AttributeDataType: 'String', Mutable: true }, // 19 chars (OK)
];

async function run() {
  try {
    console.log(`Adding attributes to User Pool: ${poolId}...`);
    const command = new AddCustomAttributesCommand({
      UserPoolId: poolId,
      CustomAttributes: attributes,
    });
    await client.send(command);
    console.log('✅ Successfully added attributes to the active User Pool!');
  } catch (error) {
    console.error('❌ Failed to add attributes:', error);
  }
}

run();
