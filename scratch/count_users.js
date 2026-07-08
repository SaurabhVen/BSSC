const { CognitoIdentityProviderClient, ListUsersCommand, DescribeUserPoolCommand } = require('@aws-sdk/client-cognito-identity-provider');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function countUsers() {
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: COGNITO_USER_POOL_ID is not configured in your .env file.');
    process.exit(1);
  }

  const client = new CognitoIdentityProviderClient({ region: AWS_REGION });
  console.log(`Checking Cognito User Pool: ${COGNITO_USER_POOL_ID} (Region: ${AWS_REGION})...`);

  // Method 1: Describe User Pool (Estimated Count)
  try {
    const describeCommand = new DescribeUserPoolCommand({ UserPoolId: COGNITO_USER_POOL_ID });
    const response = await client.send(describeCommand);
    const estimatedCount = response.UserPool?.EstimatedNumberOfUsers ?? 0;
    console.log(`[DescribeUserPool] Estimated number of users in Cognito: ${estimatedCount}`);
  } catch (err) {
    console.warn(`[DescribeUserPool Method] Access Denied: ${err.message}`);
  }

  // Method 2: List Users (Precise Count)
  try {
    let listCount = 0;
    let paginationToken = undefined;

    do {
      const listCommand = new ListUsersCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Limit: 60,
        PaginationToken: paginationToken
      });
      const response = await client.send(listCommand);
      listCount += (response.Users || []).length;
      paginationToken = response.PaginationToken;
    } while (paginationToken);

    console.log(`[ListUsers] Precise number of users in Cognito: ${listCount}`);
  } catch (err) {
    console.warn(`[ListUsers Method] Access Denied: ${err.message}`);
  }
}

countUsers();
