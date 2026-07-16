import { applicationRepository } from '../src/repositories/application.repository';
import { applicationService } from '../src/services/application.service';
import { closeDb } from '../src/database/drizzle';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const applicationId = '6592d00f-c1bb-40ea-96df-2452ecbdaa6f';
  const app = await applicationRepository.findById(applicationId);
  if (!app) {
    console.error('Application not found');
    return;
  }
  console.log(`Found application with candidateId: ${app.candidateId}`);

  const stepDataRows = await applicationRepository.getAllStepData(applicationId);
  const stepDataMap: Record<number, Record<string, any>> = {};
  for (const row of stepDataRows) {
    stepDataMap[row.stepNumber] = row.data as Record<string, any>;
  }

  console.log('--- Step 0 Data ---');
  console.log(JSON.stringify(stepDataMap[0], null, 2));

  console.log('--- Step 1 Data ---');
  console.log(JSON.stringify(stepDataMap[1], null, 2));
}

main().catch(console.error).finally(closeDb);
