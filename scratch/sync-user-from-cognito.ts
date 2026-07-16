import { handler } from '../src/handlers/auth/postConfirmation';
import { getDb, closeDb } from '../src/database/drizzle';
import { 
  users, 
  candidates, 
  applications, 
  applicationStepData, 
  payments, 
  invoices, 
  finalSubmissions, 
  candidateQualifications, 
  candidatePostPreferences, 
  candidateLanguages, 
  documents 
} from '../src/database/schema';
import { eq, inArray } from 'drizzle-orm';
import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'ap-south-1' });

async function syncUser(email: string) {
  console.log(`Syncing user from Cognito for: ${email}`);

  try {
    // 1. Fetch Cognito details
    const userRes = await client.send(new AdminGetUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
    }));

    const userAttributes: Record<string, string> = {};
    for (const attr of userRes.UserAttributes || []) {
      if (attr.Name && attr.Value) {
        userAttributes[attr.Name] = attr.Value;
      }
    }

    console.log('Fetched Cognito Attributes:', JSON.stringify(userAttributes, null, 2));

    // 2. Delete existing candidates/users from local DB to force complete clean sync
    const db = getDb();
    const existingUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (existingUsers.length > 0) {
      const uId = existingUsers[0].id;
      console.log(`Deleting existing local candidates for user ${uId}...`);
      
      const candidateRecords = await db.select().from(candidates).where(eq(candidates.userId, uId));
      for (const candidate of candidateRecords) {
        const appsForCand = await db.select().from(applications).where(eq(applications.candidateId, candidate.id));
        for (const app of appsForCand) {
          const appPayments = await db.select().from(payments).where(eq(payments.applicationId, app.id));
          for (const payment of appPayments) {
            await db.delete(invoices).where(eq(invoices.paymentId, payment.id));
            await db.delete(payments).where(eq(payments.id, payment.id));
          }
          await db.delete(applicationStepData).where(eq(applicationStepData.applicationId, app.id));
          await db.delete(finalSubmissions).where(eq(finalSubmissions.applicationId, app.id));
          await db.delete(candidateQualifications).where(eq(candidateQualifications.applicationId, app.id));
          await db.delete(candidatePostPreferences).where(eq(candidatePostPreferences.applicationId, app.id));
          await db.delete(candidateLanguages).where(eq(candidateLanguages.applicationId, app.id));
          await db.delete(applications).where(eq(applications.id, app.id));
          console.log(`- Deleted application draft ${app.id}`);
        }
        await db.delete(documents).where(eq(documents.candidateId, candidate.id));
        await db.delete(candidates).where(eq(candidates.id, candidate.id));
        console.log(`- Deleted candidate record ${candidate.id}`);
      }

      await db.delete(users).where(eq(users.id, uId));
      console.log('Deleted existing user & candidate to force fresh sync.');
    }

    // 3. Build trigger event
    const event: any = {
      version: '1',
      region: process.env.AWS_REGION || 'ap-south-1',
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      userName: userRes.Username,
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      callerContext: {
        clientId: process.env.COGNITO_CLIENT_ID,
      },
      request: {
        userAttributes: userAttributes,
      },
      response: {},
    };

    console.log('Invoking postConfirmation trigger handler...');
    await handler(event, {} as any);
    console.log('✅ Local sync completed successfully!');

  } catch (err: any) {
    console.error('❌ Sync failed:', err.message);
  }
}

const emailToSync = process.argv[2] || 'shivam+31@vensysco.in';
syncUser(emailToSync).finally(closeDb);
