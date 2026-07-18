import { CognitoIdentityProviderClient, ListUsersCommand, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getDb, closeDb } from '../src/database/drizzle';
import { users, roles, candidates, candidateMetadata, applications, applicationStepData } from '../src/database/schema';
import { eq, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateRegistrationNumber } from '../src/utils/crypto';
import { calculateBSSCAge } from '../src/utils/age';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });

const mapCategoryValue = (val: string): string => {
  const normalized = (val || '').toLowerCase().trim();
  if (normalized.includes('extremely backward') || normalized.includes('ebc') || normalized.includes('अत्यंत')) return 'ebc1';
  if (normalized.includes('backward class') || normalized.includes('bc') || normalized.includes('अनुसूची-2')) return 'bc2';
  if (normalized.includes('scheduled caste') || normalized.includes('sc') || normalized.includes('अनुसूचित जाति')) return 'sc';
  if (normalized.includes('scheduled tribe') || normalized.includes('st') || normalized.includes('अनुसूचित जनजाति')) return 'st';
  if (normalized.includes('unreserved') || normalized.includes('general') || normalized.includes('ur') || normalized.includes('गैर')) return 'unreserved';
  return normalized;
};

const parseDateString = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const parts = dateStr.split('-');
    const newDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(newDate.getTime())) {
      return newDate;
    }
  }
  return null;
};

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
        // Convert user attribute list to map for easy retrieval
        const attributes = (cognitoUser.Attributes || []).reduce((acc, attr) => {
          if (attr.Name) {
            acc[attr.Name] = attr.Value || '';
          }
          return acc;
        }, {} as Record<string, string>);

        const cognitoSub = attributes['sub'] || cognitoUser.Username; // The actual Cognito User Sub UUID
        if (!cognitoSub) continue;

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

        // Check if user already exists locally by either id or email
        const existing = await db
          .select()
          .from(users)
          .where(
            or(
              eq(users.id, cognitoSub),
              eq(users.email, normalizedEmail)
            )
          )
          .limit(1);

        let registrationNumber: string;
        let candidateId: string;
        let isNewImport = false;

        const isBiharDomicile = attributes['custom:bihar_domicile'] === 'YES';
        const isPwd = attributes['custom:is_pwd'] === 'YES';
        const isExsm = attributes['custom:ex_serviceman'] === 'YES';
        const isBiharGovt = attributes['custom:bihar_govt_emp'] === 'YES';
        const isContractual = attributes['custom:contractual_emp'] === 'YES';
        const nonCreamy = attributes['custom:non_creamy_layer'] === 'YES';
        const pwd40 = attributes['custom:pwd_40_percent'] === 'YES';
        const hasAgreement = attributes['custom:has_agreement'] === 'YES';

        const parsedAttempts = parseInt(attributes['custom:bssc_attempts'] || '1', 10);
        const attempts = isNaN(parsedAttempts) ? 1 : parsedAttempts;
        const categoryCode = mapCategoryValue(attributes['custom:category'] || '');

        const cleanedMobile = mobileNumber ? mobileNumber.replace(/^\+91/, '') : null;
        let dob: Date | null = null;
        if (dateOfBirthStr) {
          const parsedDob = new Date(dateOfBirthStr);
          if (!isNaN(parsedDob.getTime())) {
            dob = parsedDob;
          }
        }

        const metaValues = {
          gender: attributes['gender'] || null,
          category: categoryCode || null,
          caste: attributes['custom:caste'] || null,
          biharDomicile: isBiharDomicile,
          isPwd: isPwd,
          disabilityType: attributes['custom:disability_type'] || null,
          pwd40Percent: pwd40,
          isExServiceman: isExsm,
          isBiharGovtEmp: isBiharGovt,
          isContractualEmp: isContractual,
          bsscAttempts: attempts,
          nonCreamyLayer: nonCreamy,
          servicePeriod: attributes['custom:service_period'] || null,
          postName: attributes['custom:post_name'] || null,
          hasAgreement: hasAgreement,
          contractualPeriod: attributes['custom:contractual_period'] || null,
          domicileCertificateNumber: attributes['custom:domicile_cert_no'] || null,
          domicileCertificateAuthority: attributes['custom:domicile_authority'] || null,
          domicileCertificateIssueDate: parseDateString(attributes['custom:domicile_issue_date']),
          categoryCertificateNumber: attributes['custom:category_cert_no'] || null,
          categoryCertificateAuthority: attributes['custom:cat_cert_auth'] || null,
          categoryCertificateIssueDate: parseDateString(attributes['custom:cat_cert_issue_dt']),
          pwdCertificateNumber: attributes['custom:disability_cert_no'] || null,
          pwdCertificateAuthority: attributes['custom:dis_cert_auth'] || attributes['custom:dis_cert_auth_oth'] || null,
          pwdCertificateIssueDate: parseDateString(attributes['custom:dis_cert_issue_dt']),
          disTypePersist: attributes['custom:dis_type_persist'] || null,
          isScribeRequired: attributes['custom:is_scribe_required'] === 'YES',
          organizationName: attributes['custom:organization_name'] || null,
          hasPostExperience: attributes['custom:has_post_experience'] === 'YES',
        };

        if (existing.length > 0) {
          console.log(`[Sync] User ${normalizedEmail} (${cognitoSub}) already exists in PostgreSQL database. Synchronizing Cognito attributes...`);
          const candidateRecord = await db.select().from(candidates).where(eq(candidates.userId, existing[0].id)).limit(1);
          if (candidateRecord.length > 0 && candidateRecord[0].registrationNumber) {
            registrationNumber = candidateRecord[0].registrationNumber;
            candidateId = candidateRecord[0].id;

            // Ensure candidate_metadata is synchronized as well
            const metaRecord = await db.select().from(candidateMetadata).where(eq(candidateMetadata.candidateId, candidateId)).limit(1);
            if (metaRecord.length === 0) {
              console.log(`  [Sync] Metadata record missing for candidate ${candidateId}. Creating partition entry...`);
              await db.insert(candidateMetadata).values({
                candidateId,
                ...metaValues,
              });
            } else {
              console.log(`  [Sync] Metadata record exists for candidate ${candidateId}. Updating partition entry...`);
              await db.update(candidateMetadata).set(metaValues).where(eq(candidateMetadata.candidateId, candidateId));
            }

            // Sync/ensure core candidate details are up to date
            await db.update(candidates).set({
              dateOfBirth: dob,
              mobileNumber: cleanedMobile,
            }).where(eq(candidates.id, candidateId));

          } else {
            console.warn(`[Warning] Candidate record or registration number not found for existing user ${normalizedEmail}. Skipping.`);
            totalSkipped++;
            continue;
          }
        } else {
          console.log(`[Importing] User: ${normalizedEmail} (Name: ${fullName})...`);
          isNewImport = true;

          // 2. Insert User row locally using Cognito sub as DB primary key ID
          const localUser = await db.insert(users).values({
            id: cognitoSub,
            email: normalizedEmail,
            passwordHash: 'COGNITO_CONFIRMED_USER',
            fullName,
            roleId: candidateRoleId,
            isActive: true,
          }).returning();

          // 3. Insert Candidate row locally
          registrationNumber = generateRegistrationNumber('BSSC');
          candidateId = cognitoCandidateId || uuidv4();

          await db.insert(candidates).values({
            id: candidateId,
            userId: localUser[0].id,
            registrationNumber,
            dateOfBirth: dob,
            mobileNumber: cleanedMobile,
            mobileVerified: true,
            emailVerified: true,
          });

          // 4. Insert Candidate Metadata row locally (Partitioning/splitting candidate attributes)
          await db.insert(candidateMetadata).values({
            candidateId,
            ...metaValues,
          });

          // 5. Create application draft & Step 0 data for fully loaded candidates
          const applicationId = uuidv4();
          await db.insert(applications).values({
            id: applicationId,
            candidateId,
            status: 'draft',
            currentStep: 0,
            completedSteps: [],
            isSubmitted: false,
          });

          const dobFormatted = dateOfBirthStr
            ? dateOfBirthStr.split('-').reverse().join('-') // YYYY-MM-DD -> DD-MM-YYYY
            : '';

          const step0Data = {
            fullName: fullName,
            fatherName: '',
            motherName: '',
            dateOfBirth: dobFormatted,
            age: dob ? calculateBSSCAge(dob) : null,
            gender: attributes['gender'] || null,
            maritalStatus: null,
            spouseName: '',
            nationality: 'Indian',
            identityType: 'aadhaar',
            identityNumber: '',
            identificationMark1: '',
            identificationMark2: '',
            mobileNumber: cleanedMobile || '',
            alternateNumber: '',
            emailId: email,
            address: {
              permanent: {
                street: '',
                post: '',
                city: '',
                district: '',
                state: '',
                pincode: '',
                country: 'India',
              },
              correspondence: {
                sameAsPermanent: true,
                street: '',
                post: '',
                city: '',
                district: '',
                state: '',
                pincode: '',
                country: 'India',
              }
            }
          };

          await db.insert(applicationStepData).values({
            id: uuidv4(),
            applicationId: applicationId,
            stepNumber: 0,
            data: step0Data,
          });
        }

        // 6. Update Cognito user attributes (preferred_username & custom:registration_no)
        try {
          const userAttributesToUpdate = [
            { Name: 'custom:registration_no', Value: registrationNumber },
            { Name: 'preferred_username', Value: registrationNumber },
          ];

          await cognitoClient.send(new AdminUpdateUserAttributesCommand({
            UserPoolId: COGNITO_USER_POOL_ID,
            Username: cognitoUser.Username, // Cognito Username parameter (email or UUID)
            UserAttributes: userAttributesToUpdate
          }));
          console.log(`  Successfully updated Cognito attributes for ${normalizedEmail}.`);

          // Safe optional update for custom:registration_number
          try {
            await cognitoClient.send(new AdminUpdateUserAttributesCommand({
              UserPoolId: COGNITO_USER_POOL_ID,
              Username: cognitoUser.Username,
              UserAttributes: [
                { Name: 'custom:registration_number', Value: registrationNumber }
              ]
            }));
          } catch (innerErr) {}

        } catch (cognitoErr: any) {
          console.warn(`  [Warning] Failed to update attributes in Cognito for ${normalizedEmail}: ${cognitoErr.message}`);
        }

        if (isNewImport) {
          totalImported++;
        } else {
          totalSkipped++;
        }
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
