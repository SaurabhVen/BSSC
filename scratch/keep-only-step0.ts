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

    // 3. Find or create application
    let appRow = await db.select().from(applications).where(eq(applications.candidateId, candidate.id)).limit(1);
    let applicationId: string;
    if (appRow.length === 0) {
      console.log('Application not found. Creating a draft application...');
      const newApp = await db.insert(applications).values({
        id: uuidv4(),
        candidateId: candidate.id,
        status: 'draft',
        currentStep: 0,
        completedSteps: [],
        isSubmitted: false,
      }).returning();
      applicationId = newApp[0].id;
    } else {
      applicationId = appRow[0].id;
      console.log('Found existing application ID:', applicationId);
    }

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

    // 6. Build the initial combined Step 0 + Step 1 payload exactly like postConfirmation trigger
    const dob = new Date('1999-10-16');
    const step0Data = {
      fullName: "Saurabh Mishra",
      fatherName: '',
      motherName: '',
      dateOfBirth: "16-10-1999",
      age: calculateBSSCAge(dob),
      gender: 'MALE',
      maritalStatus: null,
      spouseName: '',
      nationality: 'Indian',
      identityType: 'aadhaar',
      identityNumber: '',
      identificationMark1: '',
      identificationMark2: '',
      mobileNumber: '8382044417',
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

    const step1Data = {
      isJharkhandDomicile: false,
      domicileCertificateNumber: null,
      domicileCertificateAuthority: null,
      domicileCertificateIssueDate: null,

      mainCategory: categoryId,
      subCategory: null,
      subSubCategoryId: null,
      categoryCertificateNumber: null,
      categoryCertificateAuthority: null,
      categoryCertificateIssueDate: null,

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

      isLocallyResident: false,
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

    // 7. Insert the initial step 0 data
    await db.insert(applicationStepData).values({
      id: uuidv4(),
      applicationId: applicationId,
      stepNumber: 0,
      data: initialPayload,
    });
    console.log('- Inserted initial step0 data.');

    // 8. Update applications status to currentStep: 0, completedSteps: []
    await db.update(applications).set({
      currentStep: 0,
      completedSteps: [],
      updatedAt: new Date(),
    }).where(eq(applications.id, applicationId));
    console.log('- Updated applications state (currentStep=0, completedSteps=[]).');

    console.log('\n✅ Successfully set user back to initial Cognito Registration state!');
  } catch (error) {
    console.error('Operation failed:', error);
  } finally {
    await closeDb();
  }
}

main().catch(console.error);
