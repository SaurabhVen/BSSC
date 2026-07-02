const { CognitoIdentityProviderClient, AdminSetUserPasswordCommand, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

async function run() {
  const username = 'b1436d5a-7071-7063-b705-356ff3945c54'; // Awanish Cognito sub / Username
  const email = 'awanish@vensysco.in';
  const newPassword = 'Candidate@12345';
  
  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });
  
  try {
    console.log(`Setting permanent password for ${email} in Cognito...`);
    await client.send(new AdminSetUserPasswordCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: username,
      Password: newPassword,
      Permanent: true
    }));
    console.log('Password set successfully!');
    
    console.log('Logging in to get Access Token...');
    const result = await client.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: newPassword
      }
    }));
    
    const accessToken = result.AuthenticationResult.AccessToken;
    console.log('\n==================================================');
    console.log('REAL COGNITO ACCESS TOKEN FOR AWANISH:');
    console.log(accessToken);
    console.log('==================================================\n');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
