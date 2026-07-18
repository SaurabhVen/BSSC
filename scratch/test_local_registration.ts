import { handler } from '../src/handlers/auth/postConfirmation';
import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications, applicationStepData } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testLocalRegistration() {
  const db = getDb();
  console.log('Database connected.');

  // Create a unique mock user details
  const randomId = Math.floor(Math.random() * 1000000);
  const dummyEmail = `dummy_user_${randomId}@example.com`;
  const dummySub = uuidv4();

  console.log(`Starting mock registration for email: ${dummyEmail}`);

  // Build simulated Cognito PostConfirmationTriggerEvent
  const event: any = {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_dummyPoolId',
    userName: dummySub,
    triggerSource: 'PostConfirmation_ConfirmSignUp',
    request: {
      userAttributes: {
        sub: dummySub,
        email: dummyEmail,
        email_verified: 'true',
        name: 'Mock Candidate User',
        phone_number: '+919999900000',
        birthdate: '1998-10-25',
        gender: 'male',
        'custom:bihar_domicile': 'YES',
        'custom:category': 'ur',
        'custom:is_pwd': 'YES',
        'custom:ex_serviceman': 'NO',
        'custom:bihar_govt_emp': 'YES',
        'custom:bssc_attempts': '2',
      },
    },
    response: {},
  };

  try {
    // 1. Invoke the Lambda handler
    console.log('Invoking handler...');
    const result = await handler(event, {} as any);
    console.log('Handler returned event result successfully.');

    // 2. Fetch and print the created records from the DB to verify
    console.log('\n--- VERIFYING DATABASE RECORDS ---');

    // A. Verify user record
    const userRow = await db.select().from(users).where(eq(users.id, dummySub)).limit(1);
    if (userRow.length > 0) {
      console.log('✅ User created in DB:', JSON.stringify(userRow[0], null, 2));
    } else {
      console.log('❌ User not found in DB.');
    }

    // B. Verify candidate record
    const candidateRow = await db.select().from(candidates).where(eq(candidates.userId, dummySub)).limit(1);
    let candidateId = '';
    if (candidateRow.length > 0) {
      candidateId = candidateRow[0].id;
      console.log('✅ Candidate created in DB:', JSON.stringify(candidateRow[0], null, 2));
    } else {
      console.log('❌ Candidate not found in DB.');
    }

    // C. Verify application record
    let applicationId = '';
    if (candidateId) {
      const appRow = await db.select().from(applications).where(eq(applications.candidateId, candidateId)).limit(1);
      if (appRow.length > 0) {
        applicationId = appRow[0].id;
        console.log('✅ Application created in DB:', JSON.stringify(appRow[0], null, 2));
      } else {
        console.log('❌ Application not found in DB.');
      }
    }

    // D. Verify step data record (should have stepNumber = 0 containing all flat-merged fields)
    if (applicationId) {
      const stepDataRows = await db.select().from(applicationStepData).where(eq(applicationStepData.applicationId, applicationId));
      console.log(`✅ Found ${stepDataRows.length} step data records.`);
      
      stepDataRows.forEach(row => {
        console.log(`[Step ${row.stepNumber}] Data:`, JSON.stringify(row.data, null, 2));
      });
    }

    // 3. Clean up the database records to avoid cluttering
    console.log('\n--- CLEANING UP TEST DATA ---');
    if (applicationId) {
      await db.delete(applicationStepData).where(eq(applicationStepData.applicationId, applicationId));
      console.log('Cleaned step data.');
      await db.delete(applications).where(eq(applications.id, applicationId));
      console.log('Cleaned application.');
    }
    if (candidateId) {
      await db.delete(candidates).where(eq(candidates.id, candidateId));
      console.log('Cleaned candidate.');
    }
    await db.delete(users).where(eq(users.id, dummySub));
    console.log('Cleaned user.');

    console.log('Cleanup completed successfully.');

  } catch (err: any) {
    console.error('❌ Local registration test failed:', err);
  } finally {
    closeDb();
  }
}

testLocalRegistration();
