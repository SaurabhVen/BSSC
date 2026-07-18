const { CognitoIdentityProviderClient, AddCustomAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = 'ap-south-1_nUUpexOF8';

const customAttributes = [
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
  { Name: 'ncc_cadet', AttributeDataType: 'String', Mutable: true },
  { Name: 'ncc_cert_no', AttributeDataType: 'String', Mutable: true },
  { Name: 'bihar_govt_emp', AttributeDataType: 'String', Mutable: true },
  { Name: 'bssc_attempts', AttributeDataType: 'String', Mutable: true },
  { Name: 'contractual_emp', AttributeDataType: 'String', Mutable: true },
  { Name: 'post_name', AttributeDataType: 'String', Mutable: true },
  { Name: 'has_agreement', AttributeDataType: 'String', Mutable: true },
  { Name: 'contractual_period', AttributeDataType: 'String', Mutable: true }
];

async function run() {
  console.log(`Starting to add custom attributes to User Pool: ${COGNITO_USER_POOL_ID} in region ${REGION}...`);

  const client = new CognitoIdentityProviderClient({ region: REGION });

  try {
    const command = new AddCustomAttributesCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      CustomAttributes: customAttributes
    });

    const response = await client.send(command);
    console.log('\nSUCCESS! Added all custom attributes to Cognito User Pool!', JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('\nFailed to add custom attributes:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

run();
