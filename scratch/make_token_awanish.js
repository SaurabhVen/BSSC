const { getDb } = require('../src/database/drizzle');
const { users, roles } = require('../src/database/schema');
const { eq, ilike } = require('drizzle-orm');
const jwt = require('jsonwebtoken');
const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'c807e8068945233498906c2158e63747ab9cdc6f8146ed280a9b81b768f7867e';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function run() {
  console.log('Searching for "awanish" in database...');
  let dbUser = null;
  
  try {
    const db = getDb();
    const results = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        cognitoSubId: users.cognitoSubId,
        isActive: users.isActive
      })
      .from(users)
      .where(ilike(users.email, '%awanish%'));

    if (results.length > 0) {
      dbUser = results[0];
      console.log('Found user in local DB:', dbUser);
    } else {
      console.log('No user found in local DB with email containing "awanish". Searching by first name...');
      const nameResults = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          cognitoSubId: users.cognitoSubId,
          isActive: users.isActive
        })
        .from(users)
        .where(ilike(users.firstName, '%awanish%'));
        
      if (nameResults.length > 0) {
        dbUser = nameResults[0];
        console.log('Found user in local DB (by name):', dbUser);
      } else {
        console.log('No user found in local DB matching "awanish".');
      }
    }
  } catch (err) {
    console.error('Error querying local database:', err.message);
  }

  console.log('\nSearching for "awanish" in AWS Cognito User Pool...');
  let cognitoUser = null;
  try {
    if (COGNITO_USER_POOL_ID) {
      const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
      const command = new ListUsersCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Filter: 'email *= "awanish"'
      });
      const result = await cognitoClient.send(command);
      if (result.Users && result.Users.length > 0) {
        cognitoUser = result.Users[0];
        console.log('Found user in Cognito User Pool:', cognitoUser);
      } else {
        console.log('No user found in Cognito matching "awanish".');
      }
    } else {
      console.log('Cognito User Pool ID not found in .env.');
    }
  } catch (err) {
    console.error('Error querying Cognito:', err.message);
  }

  // Generate Token
  console.log('\nGenerating mock token for local testing...');
  const userId = dbUser ? dbUser.id : (cognitoUser ? cognitoUser.Username : 'awanish-mock-id');
  const email = dbUser ? dbUser.email : 'awanish@example.com';
  const sub = dbUser && dbUser.cognitoSubId ? dbUser.cognitoSubId : userId;
  
  const payload = {
    sub: sub,
    email: email,
    'cognito:groups': ['Candidates'],
    name: 'Awanish'
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  console.log('\n==================================================');
  console.log('Generated JWT Token:');
  console.log(token);
  console.log('==================================================\n');
  console.log('Decoded Payload:', payload);
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
