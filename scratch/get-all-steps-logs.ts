import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const getLogs = async () => {
  const client = new CloudWatchLogs({
    region: process.env.AWS_REGION || 'ap-south-1',
  });

  const logGroupName = '/aws/lambda/bssc-dev-getAllStepsData';
  console.log(`Fetching latest log streams for ${logGroupName}...`);

  try {
    const streamsData = await client.describeLogStreams({
      logGroupName: logGroupName,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 3,
    });

    const streams = streamsData.logStreams || [];
    if (streams.length === 0) {
      console.log('No log streams found.');
      return;
    }

    const latestStreamName = streams[0].logStreamName;
    console.log(`Reading logs from stream: ${latestStreamName}\n`);

    const eventsData = await client.getLogEvents({
      logGroupName: logGroupName,
      logStreamName: latestStreamName,
      limit: 80,
    });

    console.log('--- LATEST LOG EVENTS ---');
    const events = eventsData.events || [];
    events.forEach(event => {
      const date = new Date(event.timestamp || 0);
      console.log(`[${date.toISOString()}] ${event.message?.trim()}`);
    });
  } catch (err: any) {
    console.error('Error fetching logs:', err.message);
  }
};

getLogs();
