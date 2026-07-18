import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../.env') });

import { cognitoConfirmSignUp, cognitoAdminGetUser } from '../src/utils/cognito';

async function run() {
  const email = 'saurabh@vensysco.in';
  const otp = process.argv[2];

  if (!otp) {
    console.error('Error: Please provide the OTP code as an argument. Example: npx ts-node scratch/confirm-saurabh.ts 123456');
    process.exit(1);
  }

  console.log(`Confirming registration for: ${email} with OTP: ${otp}`);

  try {
    // 1. Confirm signup in Cognito User Pool
    await cognitoConfirmSignUp(email, otp);
    console.log('Cognito signup confirmed successfully!');

    // 2. Fetch Cognito User to check if custom:registration_no attribute is updated
    console.log('\nFetching updated Cognito user profile...');
    const cognitoUser = await cognitoAdminGetUser(email);
    console.log('\nCognito User Attributes:');
    if (cognitoUser && cognitoUser.UserAttributes) {
      console.log(JSON.stringify(cognitoUser.UserAttributes, null, 2));
      const regAttr = (cognitoUser.UserAttributes as any[]).find(attr => attr.Name === 'custom:registration_no');
      if (regAttr) {
        console.log(`\n🎉 Success! custom:registration_no attribute is set to: "${regAttr.Value}"`);
      } else {
        console.log('\n⚠️ Warning: custom:registration_no attribute is NOT found in Cognito.');
      }
    } else {
      console.log('Could not fetch Cognito user.');
    }
  } catch (err: any) {
    console.error('Confirmation failed:', err.message);
  }
}

run();
