import dotenv from 'dotenv';
dotenv.config();

import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications, applicationStepData, categories } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { calculateBSSCAge } from '../src/utils/age';

async function main() {
  console.log('Connecting to database...');
  const db = getDb();
  const email = 'saurabh+9@vensysco.in';

  try {
    // 1. Find user
    const userRow = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userRow.length === 0) {
      console.error(`User with email ${email} not found!`);
      return;
    }
    const user = userRow[0];

    // 2. Find candidate
    const candRow = await db.select().from(candidates).where(eq(candidates.userId, user.id)).limit(1);
    if (candRow.length === 0) {
      console.error(`Candidate profile not found for user ID: ${user.id}`);
      return;
    }
    const candidate = candRow[0];

    // 3. Find application
    const appRow = await db.select().from(applications).where(eq(applications.candidateId, candidate.id)).limit(1);
    if (appRow.length === 0) {
      console.error('Application not found!');
      return;
    }
    const applicationId = appRow[0].id;

    // 4. Delete all step data rows to clear any populated steps
    await db.delete(applicationStepData).where(eq(applicationStepData.applicationId, applicationId));
    console.log('Deleted existing step data.');

    // 5. Get category ID for 'UR' (unreserved)
    let categoryId: number | null = null;
    const catRows = await db
      .select()
      .from(categories)
      .where(eq(categories.catValue, 'unreserved'))
      .limit(1);
    if (catRows.length > 0) {
      categoryId = catRows[0].catId;
    }

    // 6. Build the Step 1 candidate personal info payload (corresponding to backend step 0)
    const dob = new Date('1999-10-16');
    const step0Data = {
      fullName: "Saurabh Mishra",
      fatherName: 'Father Name',
      motherName: 'Mother Name',
      dateOfBirth: "16-10-1999",
      age: calculateBSSCAge(dob),
      gender: 'male',
      maritalStatus: 'unmarried',
      spouseName: '',
      nationality: 'Indian',
      identityType: 'aadhaar',
      identityNumber: '123456789012',
      identificationMark1: 'Mole on right cheek',
      identificationMark2: '',
      mobileNumber: '8382044417',
      alternateNumber: '',
      emailId: email,
      address: {
        permanent: {
          street: '123 Test Street',
          post: 'Test Post',
          city: 'Patna',
          district: 'Patna',
          state: 'Bihar',
          pincode: '800001',
          country: 'India',
        },
        correspondence: {
          sameAsPermanent: true,
        }
      }
    };

    const step1Data = {
      isJharkhandDomicile: false,
      domicileCertificateNumber: 'DOM12345',
      domicileCertificateAuthority: 'CO',
      domicileCertificateIssueDate: '01-01-2025',

      mainCategory: categoryId,
      subCategory: null,
      subSubCategoryId: null,
      categoryCertificateNumber: 'CAT12345',
      categoryCertificateAuthority: 'CO',
      categoryCertificateIssueDate: '01-01-2025',

      isPwd: false,
      pwdType: null,
      pwdPercentage: null,
      pwdCertificateNumber: null,
      pwdCertificateAuthority: null,
      pwdCertificateIssueDate: null,

      isExServiceman: false,
      exServicemanYears: null,

      isSportsQuota: false,
      sportsLevel: null,
      sportsAchievement: null,
      sportsCertificateNumber: null,
      sportsCertificateAuthority: null,
      sportsCertificateIssueDate: null,

      isLocallyResident: true,
      localDistrictId: null,

      declaration: true,

      biharGovtEmp: 'NO',
      bsscAttempts: '1',
      contractualEmp: 'NO',
      nccCadet: 'NO',
      nonCreamyLayer: 'NO',
      pwd40Percent: 'NO',
      contractualPeriod: '0-0-0',
      postName: 'post_1',
      hasAgreement: 'NO',
    };

    const initialPayload = {
      ...step0Data,
      ...step1Data,
    };

    // 7. Insert the step 0 data (mapping to client Step 1)
    await db.insert(applicationStepData).values({
      id: uuidv4(),
      applicationId: applicationId,
      stepNumber: 0,
      data: initialPayload,
    });
    console.log('- Inserted Step 1 (backend step 0) data.');

    // 8. Update applications status to currentStep: 1, completedSteps: [0]
    await db.update(applications).set({
      currentStep: 1,
      completedSteps: [0],
      updatedAt: new Date(),
    }).where(eq(applications.id, applicationId));
    console.log('- Updated applications state (currentStep=1, completedSteps=[0]).');

    console.log('\n✅ Successfully set user application status to Step 1 Completed state!');
  } catch (error) {
    console.error('Operation failed:', error);
  } finally {
    await closeDb();
  }
}

main().catch(console.error);
