const { CognitoIdentityProviderClient, DescribeUserPoolCommand, UpdateUserPoolCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { LambdaClient, AddPermissionCommand, RemovePermissionCommand } = require('@aws-sdk/client-lambda');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const POST_CONFIRMATION_LAMBDA = 'bssc-dev-postConfirmation';
const CUSTOM_MESSAGE_LAMBDA = 'bssc-dev-customMessage';

async function configureTriggers() {
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: COGNITO_USER_POOL_ID is not configured.');
    process.exit(1);
  }

  const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
  const lambdaClient = new LambdaClient({ region: AWS_REGION });

  try {
    // 1. Add permission for PostConfirmation Lambda
    console.log(`Adding permission to Lambda function ${POST_CONFIRMATION_LAMBDA} for Cognito...`);
    try {
      await lambdaClient.send(new RemovePermissionCommand({
        FunctionName: POST_CONFIRMATION_LAMBDA,
        StatementId: 'CognitoPostConfirmationTrigger'
      })).catch(() => {});

      await lambdaClient.send(new AddPermissionCommand({
        FunctionName: POST_CONFIRMATION_LAMBDA,
        StatementId: 'CognitoPostConfirmationTrigger',
        Action: 'lambda:InvokeFunction',
        Principal: 'cognito-idp.amazonaws.com',
        SourceArn: `arn:aws:cognito-idp:${AWS_REGION}:485038482643:userpool/${COGNITO_USER_POOL_ID}`
      }));
      console.log('Successfully added PostConfirmation permission.');
    } catch (err) {
      console.error('Failed to add PostConfirmation permission:', err.message);
    }

    // 2. Add permission for CustomMessage Lambda
    console.log(`Adding permission to Lambda function ${CUSTOM_MESSAGE_LAMBDA} for Cognito...`);
    try {
      await lambdaClient.send(new RemovePermissionCommand({
        FunctionName: CUSTOM_MESSAGE_LAMBDA,
        StatementId: 'CognitoCustomMessageTrigger'
      })).catch(() => {});

      await lambdaClient.send(new AddPermissionCommand({
        FunctionName: CUSTOM_MESSAGE_LAMBDA,
        StatementId: 'CognitoCustomMessageTrigger',
        Action: 'lambda:InvokeFunction',
        Principal: 'cognito-idp.amazonaws.com',
        SourceArn: `arn:aws:cognito-idp:${AWS_REGION}:485038482643:userpool/${COGNITO_USER_POOL_ID}`
      }));
      console.log('Successfully added CustomMessage permission.');
    } catch (err) {
      console.error('Failed to add CustomMessage permission:', err.message);
    }

    // 3. Describe User Pool to get current configs
    console.log(`Describing User Pool ${COGNITO_USER_POOL_ID}...`);
    const poolInfo = await cognitoClient.send(new DescribeUserPoolCommand({
      UserPoolId: COGNITO_USER_POOL_ID
    }));

    // 4. Update User Pool LambdaConfig & EmailConfiguration
    console.log('Updating User Pool Lambda triggers and Email settings...');
    const currentLambdaConfig = poolInfo.UserPool.LambdaConfig || {};
    const updatedLambdaConfig = {
      ...currentLambdaConfig,
      PostConfirmation: `arn:aws:lambda:${AWS_REGION}:485038482643:function:${POST_CONFIRMATION_LAMBDA}`,
      CustomMessage: `arn:aws:lambda:${AWS_REGION}:485038482643:function:${CUSTOM_MESSAGE_LAMBDA}`
    };

    await cognitoClient.send(new UpdateUserPoolCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      LambdaConfig: updatedLambdaConfig,
      EmailConfiguration: {
        EmailSendingAccount: 'DEVELOPER',
        SourceArn: `arn:aws:ses:${AWS_REGION}:485038482643:identity/vensysco.in`,
        From: 'noreply@vensysco.in'
      }
    }));
    console.log('🎉 Successfully configured triggers and Developer SES sending on Cognito!');
  } catch (err) {
    console.error('Error during configuration:', err.message);
  }
}

configureTriggers();
