const { cognitoLogin } = require('../src/utils/cognito');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const email = 'awanish@vensysco.in';
  const passwords = [
    'Candidate@12345',
    'Candidate@123',
    'Vensysco@12345',
    'Vensysco@123',
    'Admin@12345',
    'Admin@123'
  ];

  for (const password of passwords) {
    try {
      console.log(`Trying login with password: ${password}...`);
      const tokens = await cognitoLogin(email, password);
      console.log('\nSUCCESS! Logged in successfully!');
      console.log('Access Token:');
      console.log(tokens.accessToken);
      console.log('Refresh Token:', tokens.refreshToken);
      return;
    } catch (err) {
      console.log(`Failed: ${err.message}`);
    }
  }
}

run();
