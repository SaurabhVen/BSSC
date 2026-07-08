import { CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new CloudWatchLogsClient({ region: process.env.AWS_REGION || 'ap-south-1' });

async function run() {
  const logGroupName = '/aws/lambda/bssc-dev-postConfirmation';
  console.log(`Listing log streams for group: ${logGroupName}`);

  try {
    const streamsResponse = await client.send(new DescribeLogStreamsCommand({
      logGroupName,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 5,
    }));

    if (!streamsResponse.logStreams || streamsResponse.logStreams.length === 0) {
      console.log('No log streams found for this function.');
      return;
    }

    const latestStream = streamsResponse.logStreams[0];
    console.log(`Latest log stream: ${latestStream.logStreamName} (Last Event: ${new Date(latestStream.lastEventTimestamp || 0).toISOString()})`);

    const eventsResponse = await client.send(new GetLogEventsCommand({
      logGroupName,
      logStreamName: latestStream.logStreamName!,
      limit: 50,
      startFromHead: false,
    }));

    console.log('=== LOG EVENTS ===');
    if (eventsResponse.events) {
      for (const event of eventsResponse.events) {
        const date = new Date(event.timestamp || 0).toISOString();
        console.log(`[${date}] ${event.message?.trim()}`);
      }
    } else {
      console.log('No log events in this stream.');
    }
  } catch (err: any) {
    console.error('Error fetching logs:', err.message);
  }
}

run();
