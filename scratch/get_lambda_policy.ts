import { LambdaClient, GetFunctionConfigurationCommand } from '@aws-sdk/client-lambda';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new LambdaClient({ region: process.env.AWS_REGION || 'ap-south-1' });

async function run() {
  const functionName = 'bssc-dev-postConfirmation';
  console.log(`Fetching configuration for Lambda: ${functionName}`);

  try {
    const command = new GetFunctionConfigurationCommand({ FunctionName: functionName });
    const response = await client.send(command);
    console.log('=== LAMBDA ENVIRONMENT VARIABLES ===');
    console.log(JSON.stringify(response.Environment?.Variables, null, 2));
  } catch (err: any) {
    console.error('Error fetching configuration:', err.message);
  }
}

run();
