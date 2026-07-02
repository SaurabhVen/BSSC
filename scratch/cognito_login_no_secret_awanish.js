const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

async function run() {
  const email = 'awanish@vensysco.in';
  const passwords = [
    'Vensysco@123',
    'Candidate@12345',
    'Candidate@123',
    'Vensysco@12345',
    'Admin@12345',
    'Admin@123'
  ];

  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });

  for (const password of passwords) {
    try {
      console.log(`Trying login without SecretHash with password: ${password}...`);
      const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      };

      const command = new InitiateAuthCommand(params);
      const result = await client.send(command);

      console.log('\nSUCCESS! Logged in successfully!');
      console.log('Access Token:');
      console.log(result.AuthenticationResult.AccessToken);
      console.log('Refresh Token:', result.AuthenticationResult.RefreshToken);
      return;
    } catch (err) {
      console.log(`Failed: ${err.message}`);
    }
  }
}

run();
