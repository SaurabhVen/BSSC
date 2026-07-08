import { CognitoIdentityProviderClient, ListUsersCommand, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getDb, closeDb } from '../src/database/drizzle';
import { users, roles, candidates } from '../src/database/schema';
import { eq, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateRegistrationNumber } from '../src/utils/crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });

async function syncUsers() {
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: COGNITO_USER_POOL_ID is not configured in your .env file.');
    process.exit(1);
  }

  const db = getDb();
  console.log('Connecting to local PostgreSQL database...');
  console.log(`Fetching users from Cognito User Pool: ${COGNITO_USER_POOL_ID} (Region: ${AWS_REGION})...`);

  // 1. Ensure the candidate role exists
  let candidateRoleRows = await db.select().from(roles).where(eq(roles.name, 'candidate')).limit(1);
  let candidateRoleId: string;

  if (candidateRoleRows.length > 0) {
    candidateRoleId = candidateRoleRows[0].id;
  } else {
    console.log('Candidate role not found in database. Creating it...');
    const inserted = await db
      .insert(roles)
      .values({
        id: uuidv4(),
        name: 'candidate',
        description: 'Applicant filling the portal',
      })
      .returning();
    candidateRoleId = inserted[0].id;
  }

  let paginationToken: string | undefined = undefined;
  let totalProcessed = 0;
  let totalImported = 0;
  let totalSkipped = 0;

  do {
    try {
      const command: ListUsersCommand = new ListUsersCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Limit: 60,
        PaginationToken: paginationToken,
      });

      const response = await cognitoClient.send(command);
      paginationToken = response.PaginationToken;

      const cognitoUsers = response.Users || [];
      if (cognitoUsers.length === 0) {
        break;
      }

      console.log(`Fetched ${cognitoUsers.length} users from Cognito...`);

      for (const cognitoUser of cognitoUsers) {
        totalProcessed++;
        const cognitoSub = cognitoUser.Username; // The User's unique sub ID
        if (!cognitoSub) continue;

        // Convert user attribute list to map for easy retrieval
        const attributes = (cognitoUser.Attributes || []).reduce((acc, attr) => {
          if (attr.Name) {
            acc[attr.Name] = attr.Value || '';
          }
          return acc;
        }, {} as Record<string, string>);

        const email = attributes['email'];
        const fullName = attributes['name'] || 'Candidate Name';
        const mobileNumber = attributes['phone_number'] || '';
        const dateOfBirthStr = attributes['birthdate'] || '';
        const cognitoCandidateId = attributes['custom:candidate_id'];

        if (!email) {
          console.warn(`[Warning] User ${cognitoSub} is missing email. Skipping.`);
          totalSkipped++;
          continue;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists locally by either cognitoSubId or email
        const existing = await db
          .select()
          .from(users)
          .where(
            or(
              eq(users.cognitoSubId, cognitoSub),
              eq(users.email, normalizedEmail)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          console.log(`[Skip] User ${normalizedEmail} (${cognitoSub}) already exists in PostgreSQL database.`);
          totalSkipped++;
          continue;
        }

        console.log(`[Importing] User: ${normalizedEmail} (Name: ${fullName})...`);

        // 2. Insert User row locally using Cognito sub as DB primary key ID
        const localUser = await db.insert(users).values({
          id: cognitoSub,
          email: normalizedEmail,
          passwordHash: 'COGNITO_CONFIRMED_USER',
          fullName,
          roleId: candidateRoleId,
          cognitoSubId: cognitoSub,
          isActive: true,
        }).returning();

        // 3. Insert Candidate row locally
        const registrationNumber = generateRegistrationNumber('BSSC');
        const cleanedMobile = mobileNumber ? mobileNumber.replace(/^\+91/, '') : null;
        
        let dob: Date | null = null;
        if (dateOfBirthStr) {
          const parsedDob = new Date(dateOfBirthStr);
          if (!isNaN(parsedDob.getTime())) {
            dob = parsedDob;
          }
        }

        // Use Cognito custom attribute candidate ID if available, otherwise generate new
        const candidateId = cognitoCandidateId || uuidv4();

        const candidateResult = await db.insert(candidates).values({
          id: candidateId,
          userId: localUser[0].id,
          registrationNumber,
          dateOfBirth: dob,
          mobileNumber: cleanedMobile,
          mobileVerified: true,
          emailVerified: true,
        }).returning();

        // 4. If custom:candidate_id was NOT in Cognito, update Cognito so they map correctly
        if (!cognitoCandidateId) {
          try {
            await cognitoClient.send(new AdminUpdateUserAttributesCommand({
              UserPoolId: COGNITO_USER_POOL_ID,
              Username: cognitoSub,
              UserAttributes: [
                {
                  Name: 'custom:candidate_id',
                  Value: candidateId,
                }
              ]
            }));
            console.log(`  Updated Cognito user with custom:candidate_id: ${candidateId}`);
          } catch (cognitoErr: any) {
            console.warn(`  [Warning] Failed to update custom:candidate_id in Cognito: ${cognitoErr.message}`);
          }
        }

        totalImported++;
      }

    } catch (err: any) {
      console.error('Error listing or importing Cognito users:', err.message);
      break;
    }
  } while (paginationToken);

  console.log('=== Cognito Synchronization Complete ===');
  console.log(`Processed: ${totalProcessed} users.`);
  console.log(`Imported successfully: ${totalImported} users.`);
  console.log(`Skipped (already exists): ${totalSkipped} users.`);
}

syncUsers()
  .catch((err) => {
    console.error('Migration failed:', err);
  })
  .finally(closeDb);
