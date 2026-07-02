import { cognitoLogin } from '../src/utils/cognito';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const credentials = [
    { email: 'awanish@vensysco.in', password: 'Awanish@123' },
    { email: 'alok.rai@vensysco.in', password: 'Alok@1234' },
    { email: 'admin@candidateportal.gov.in', password: 'Admin@12345' },
    { email: 'admin@bssc.in', password: 'Admin@123!' }
  ];

  for (const cred of credentials) {
    try {
      console.log(`Trying login for ${cred.email}...`);
      const tokens = await cognitoLogin(cred.email, cred.password);
      console.log(`\nSUCCESS for ${cred.email}:`);
      console.log(`Access Token: ${tokens.accessToken}`);
      console.log(`ID Token: ${tokens.idToken}`);
      console.log(`Refresh Token: ${tokens.refreshToken}`);
      return;
    } catch (e) {
      console.error(`Failed for ${cred.email}:`, (e as Error).message);
    }
  }
}

main().catch(console.error);
