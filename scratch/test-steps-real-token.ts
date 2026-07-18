import { applicationService } from '../src/services/application.service';
import { closeDb } from '../src/database/drizzle';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const candidateId = '40da5eb8-52c3-497b-989c-8e387cedb658';
  const applicationId = '6592d00f-c1bb-40ea-96df-2452ecbdaa6f'; // Testing the draft app

  console.log(`=== Fetching Steps Data for Candidate: ${candidateId} (Draft App: ${applicationId}) ===`);
  const response = (await applicationService.getAllStepsData(candidateId, applicationId)) as any;
  
  console.log('JSON_RESPONSE_START');
  console.log(JSON.stringify(response.steps, null, 2));
  console.log('JSON_RESPONSE_END');
}

main().catch(console.error).finally(closeDb);
