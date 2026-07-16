const { CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const getLogs = async () => {
  const client = new CloudWatchLogsClient({
    region: process.env.AWS_REGION || 'ap-south-1',
  });

  const logGroupName = '/aws/lambda/bssc-dev-postConfirmation';
  console.log(`Fetching latest log streams for ${logGroupName}...`);

  try {
    const streamsData = await client.send(
      new DescribeLogStreamsCommand({
        logGroupName: logGroupName,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 3,
      })
    );

    const streams = streamsData.logStreams || [];
    if (streams.length === 0) {
      console.log('No log streams found.');
      return;
    }

    const latestStreamName = streams[0].logStreamName;
    console.log(`Reading logs from stream: ${latestStreamName}\n`);

    const eventsData = await client.send(
      new GetLogEventsCommand({
        logGroupName: logGroupName,
        logStreamName: latestStreamName,
        limit: 80,
      })
    );

    console.log('--- LATEST LOG EVENTS ---');
    const events = eventsData.events || [];
    events.forEach(event => {
      const date = new Date(event.timestamp);
      console.log(`[${date.toISOString()}] ${event.message.trim()}`);
    });
  } catch (err) {
    console.error('Error fetching logs:', err.message);
  }
};

getLogs();
