import { authService } from '../src/services/auth.service';
import { getDb, closeDb } from '../src/database/drizzle';
import { captchas } from '../src/database/schema';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const db = getDb();
  
  // 1. Pre-generate and insert a captcha code
  const captchaId = uuidv4();
  const captchaText = '12345';
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
  
  console.log(`Inserting test captcha into database: ID="${captchaId}", Code="${captchaText}"...`);
  await db.insert(captchas).values({
    id: captchaId,
    code: captchaText,
    expiresAt,
  });

  const username = process.argv[2] || 'BSSC2026635065018';
  const password = process.argv[3] || 'TestPass123!';

  console.log(`\nCalling authService.login for "${username}"...`);

  try {
    const result = await authService.login({
      email: username,
      password,
      captchaId,
      captchaText,
    });

    console.log('\n🎉 BACKEND LOGIN SUCCESS!');
    console.log('User Profile:', JSON.stringify(result.user, null, 2));
    console.log('Candidate Info:', JSON.stringify(result.candidate, null, 2));
    console.log('Tokens object returned:');
    if (result.tokens) {
      console.log(`  AccessToken: ${result.tokens.accessToken?.substring(0, 40)}...`);
      console.log(`  IdToken: ${result.tokens.idToken?.substring(0, 40)}...`);
      console.log(`  RefreshToken: ${result.tokens.refreshToken?.substring(0, 40)}...`);
    } else {
      console.log('  Tokens are undefined!');
    }
  } catch (err: any) {
    console.error('\n❌ BACKEND LOGIN FAILED:', err.message);
  }
}

run()
  .catch(console.error)
  .finally(closeDb);
