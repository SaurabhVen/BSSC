const { getDb, closeDb } = require('../src/database/drizzle');
const { sql } = require('drizzle-orm');
const { 
  CognitoIdentityProviderClient, 
  AdminSetUserPasswordCommand,
  InitiateAuthCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

const run = async () => {
  const db = getDb();
  console.log('Connecting to database...');
  try {
    // Query the database for a candidate whose payment status is not completed/success
    const query = `
      SELECT 
        u.id AS "userId",
        u.email,
        u.full_name AS "fullName",
        c.id AS "candidateId",
        c.registration_number AS "registrationNumber",
        a.id AS "applicationId",
        a.status AS "applicationStatus",
        COALESCE(
          (
            SELECT status 
            FROM payments 
            WHERE application_id = a.id AND status IN ('completed', 'success')
            LIMIT 1
          ),
          'none'
        ) AS "paymentStatus"
      FROM users u
      JOIN candidates c ON c.user_id = u.id
      LEFT JOIN applications a ON a.candidate_id = c.id
      ORDER BY u.created_at DESC;
    `;
    const result = await db.execute(sql.raw(query));
    const unpaid = result.rows.filter(row => row.paymentStatus !== 'completed' && row.paymentStatus !== 'success');
    
    if (unpaid.length === 0) {
      console.log('No candidates found with unpaid status.');
      return;
    }
    
    const targetCandidate = unpaid[0];
    console.log(`\nFound unpaid candidate: ${targetCandidate.email}`);
    console.log(`Registration No: ${targetCandidate.registrationNumber}`);
    
    const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
    const tempPassword = 'Password@12345';
    
    console.log(`Setting password to "${tempPassword}" in Cognito User Pool...`);
    const setPassCommand = new AdminSetUserPasswordCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: targetCandidate.email,
      Password: tempPassword,
      Permanent: true
    });
    await cognitoClient.send(setPassCommand);
    console.log('Password updated successfully.');
    
    console.log('Logging in to Cognito...');
    const loginCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: targetCandidate.email,
        PASSWORD: tempPassword
      }
    });
    
    const loginRes = await cognitoClient.send(loginCommand);
    console.log('\n=== LOGIN SUCCESSFUL ===');
    console.log(`Email: ${targetCandidate.email}`);
    console.log(`Reg No: ${targetCandidate.registrationNumber}`);
    console.log(`Password: ${tempPassword}`);
    console.log(`Access Token:\n${loginRes.AuthenticationResult.AccessToken}\n`);
    
  } catch (err) {
    console.error('Error during execution:', err.message);
  } finally {
    await closeDb();
  }
};

run();
