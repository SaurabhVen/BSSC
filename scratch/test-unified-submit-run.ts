import { applicationService } from '../src/services/application.service';
import { closeDb } from '../src/database/drizzle';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const applicationId = '229f0edd-84b4-464f-951c-a605a965236f';
  const candidateId = '8718aa59-3030-4c35-92a7-01627160cd15';
  
  console.log(`Submitting application ${applicationId} for candidate ${candidateId}...`);
  try {
    const result = await applicationService.submitApplication(applicationId, candidateId);
    console.log('Submission Result:', result);
  } catch (err: any) {
    console.error('Error during submission:', err.message || err);
  }
}

main()
  .catch(console.error)
  .finally(closeDb);
