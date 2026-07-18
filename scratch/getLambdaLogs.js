const { CloudWatchLogsClient, FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const getLogs = async () => {
  const client = new CloudWatchLogsClient({
    region: process.env.AWS_REGION || 'ap-south-1',
  });

  console.log('Fetching log events for /aws/lambda/bssc-dev-postConfirmation...');
  try {
    const data = await client.send(
      new FilterLogEventsCommand({
        logGroupName: '/aws/lambda/bssc-dev-postConfirmation',
        limit: 50,
      })
    );

    console.log('--- CLOUDWATCH LOGS ---');
    const events = data.events || [];
    events.forEach(event => {
      const date = new Date(event.timestamp);
      console.log(`[${date.toISOString()}] ${event.message.trim()}`);
    });
  } catch (err) {
    console.error('Error fetching logs:', err.message);
  }
};

getLogs();
