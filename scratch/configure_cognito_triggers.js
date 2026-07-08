const { CognitoIdentityProviderClient, DescribeUserPoolCommand, UpdateUserPoolCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { LambdaClient, AddPermissionCommand, RemovePermissionCommand } = require('@aws-sdk/client-lambda');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const LAMBDA_FUNCTION_NAME = 'bssc-dev-postConfirmation';
const LAMBDA_ARN = `arn:aws:lambda:${AWS_REGION}:485038482643:function:${LAMBDA_FUNCTION_NAME}`;

async function configureTriggers() {
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: COGNITO_USER_POOL_ID is not configured.');
    process.exit(1);
  }

  const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
  const lambdaClient = new LambdaClient({ region: AWS_REGION });

  try {
    // 1. Add Permission to Lambda function so Cognito can invoke it
    console.log(`Adding permission to Lambda function ${LAMBDA_FUNCTION_NAME} for Cognito...`);
    try {
      // Try removing existing permission first to avoid collision if it exists
      await lambdaClient.send(new RemovePermissionCommand({
        FunctionName: LAMBDA_FUNCTION_NAME,
        StatementId: 'CognitoPostConfirmationTrigger'
      })).catch(() => {});

      await lambdaClient.send(new AddPermissionCommand({
        FunctionName: LAMBDA_FUNCTION_NAME,
        StatementId: 'CognitoPostConfirmationTrigger',
        Action: 'lambda:InvokeFunction',
        Principal: 'cognito-idp.amazonaws.com',
        SourceArn: `arn:aws:cognito-idp:${AWS_REGION}:485038482643:userpool/${COGNITO_USER_POOL_ID}`
      }));
      console.log('Successfully added invocation permission to Lambda.');
    } catch (err) {
      console.error('Failed to add Lambda permission:', err.message);
      throw err;
    }

    // 2. Describe User Pool to get current schema and configs
    console.log(`Describing User Pool ${COGNITO_USER_POOL_ID}...`);
    const poolInfo = await cognitoClient.send(new DescribeUserPoolCommand({
      UserPoolId: COGNITO_USER_POOL_ID
    }));

    // 3. Update User Pool LambdaConfig
    console.log('Updating User Pool Lambda triggers...');
    const currentLambdaConfig = poolInfo.UserPool.LambdaConfig || {};
    const updatedLambdaConfig = {
      ...currentLambdaConfig,
      PostConfirmation: LAMBDA_ARN
    };

    await cognitoClient.send(new UpdateUserPoolCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      LambdaConfig: updatedLambdaConfig
    }));
    console.log('🎉 Successfully configured PostConfirmation Lambda trigger on Cognito User Pool!');
  } catch (err) {
    console.error('Error during configuration:', err.message);
  }
}

configureTriggers();
