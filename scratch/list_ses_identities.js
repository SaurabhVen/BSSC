const { SESClient, ListIdentitiesCommand } = require('@aws-sdk/client-ses');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new SESClient({ region: process.env.AWS_REGION || 'ap-south-1' });

async function run() {
  try {
    const data = await client.send(new ListIdentitiesCommand({}));
    console.log('Verified SES Identities:', data.Identities);
  } catch (err) {
    console.error('Error listing SES identities:', err);
  }
}

run();
