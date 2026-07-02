import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'c807e8068945233498906c2158e63747ab9cdc6f8146ed280a9b81b768f7867e';

function main() {
  const payload = {
    sub: '3fd42b64-ff77-41ff-8a1b-dae5cefd8975', // alok.rai@vensysco.in's cognitoSubId in the DB
    email: 'alok.rai@vensysco.in',
    'cognito:groups': ['admin', 'Admins']
  };

  // Generate a token valid for 1 year for convenient testing
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' });

  console.log('\n=========================================');
  console.log('       ADMIN LOCAL FALLBACK JWT');
  console.log('=========================================');
  console.log(`Email:       ${payload.email}`);
  console.log(`Sub/ID:      ${payload.sub}`);
  console.log(`Groups:      ${JSON.stringify(payload['cognito:groups'])}`);
  console.log('-----------------------------------------');
  console.log(`JWT Token:\n${token}`);
  console.log('=========================================\n');
}

main();
