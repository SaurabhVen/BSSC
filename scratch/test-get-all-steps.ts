import { applicationService } from '../src/services/application.service';
import { userRepository } from '../src/repositories/user.repository';
import { getDb, closeDb } from '../src/database/drizzle';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const email = 'anil444@yopmail.com';
  console.log(`Testing getAllStepsData for Email: ${email}`);

  const user = await userRepository.findByEmail(email);
  if (!user) {
    console.error('❌ User not found for email:', email);
    return;
  }

  const candidate = await userRepository.findCandidateByUserId(user.id);
  if (!candidate) {
    console.error('❌ Candidate profile not found for user ID:', user.id);
    return;
  }

  console.log('✅ Candidate found:', JSON.stringify(candidate, null, 2));
  console.log('Candidate ID:', candidate.id);

  try {
    const data = await applicationService.getAllStepsData(candidate.id);
    console.log('✅ getAllStepsData succeeded!', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('❌ getAllStepsData failed with error:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

main()
  .catch(console.error)
  .finally(closeDb);
