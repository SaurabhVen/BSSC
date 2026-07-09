// Polyfill for global fetch and crypto which are required by amazon-cognito-identity-js in Node environment
global.fetch = require('node-fetch');

const {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails
} = require('amazon-cognito-identity-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const poolData = {
  UserPoolId: process.env.COGNITO_USER_POOL_ID,
  ClientId: process.env.COGNITO_CLIENT_ID
};

const userPool = new CognitoUserPool(poolData);

function login(usernameOrRegNumber, password) {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({
      Username: usernameOrRegNumber,
      Password: password
    });

    const cognitoUser = new CognitoUser({
      Username: usernameOrRegNumber,
      Pool: userPool
    });

    console.log(`Sending SRP auth request for username: "${usernameOrRegNumber}"...`);
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({
          accessToken: session.getAccessToken().getJwtToken(),
          idToken: session.getIdToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken()
        });
      },
      onFailure: (err) => reject(err),
    });
  });
}

async function run() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Error: Please specify username and password');
    process.exit(1);
  }

  try {
    const tokens = await login(username, password);
    console.log('\n✅ SRP LOGIN SUCCESS!');
    console.log('AccessToken:', tokens.accessToken.substring(0, 40) + '...');
    console.log('IdToken:', tokens.idToken.substring(0, 40) + '...');
  } catch (err) {
    console.error('\n❌ SRP LOGIN FAILED:', err.message);
  }
}

run();
