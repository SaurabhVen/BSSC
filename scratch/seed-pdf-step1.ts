import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications, applicationStepData, categories } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { calculateBSSCAge } from '../src/utils/age';

async function main() {
  console.log('Connecting to database...');
  const db = getDb();
  const email = 'saurabh+5@vensysco.in';

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

    // 5. Get category ID for 'EBC' (catValue 'ebc1' in database)
    let categoryId: number | null = null;
    const catRows = await db
      .select()
      .from(categories)
      .where(eq(categories.catValue, 'ebc1'))
      .limit(1);
    if (catRows.length > 0) {
      categoryId = catRows[0].catId;
      console.log(`Resolved Category EBC ID to: ${categoryId}`);
    } else {
      categoryId = 1; // Fallback
    }

    // 6. Build the Step 1 candidate personal info payload (corresponding to backend step 0)
    const dob = new Date('2000-10-18');
    const step0Data = {
      fullName: "NANCY KUMARI GUPTA",
      fatherName: "LATE RAMESH PRASAD",
      motherName: "SUNITA DEVI",
      dateOfBirth: "18-10-2000",
      age: calculateBSSCAge(dob),
      gender: 'female',
      maritalStatus: 'unmarried',
      spouseName: '',
      nationality: 'Indian',
      identityType: 'aadhaar',
      identityNumber: '689393252547',
      identificationMark1: 'MOLE ON THE LEFT PALM',
      identificationMark2: '',
      mobileNumber: '8382044417',
      alternateNumber: '',
      emailId: email,
      address: {
        permanent: {
          street: 'HOUSE NO.- 33, GOLA ROAD JHAKHARI MAHADEV DANAPUR',
          post: 'DANAPUR',
          city: 'JHAKHARI MAHADEV',
          district: 'PATNA',
          state: 'BIHAR',
          pincode: '801503',
          country: 'India',
        },
        correspondence: {
          sameAsPermanent: true,
          street: 'HOUSE NO.- 33, GOLA ROAD JHAKHARI MAHADEV DANAPUR',
          post: 'DANAPUR',
          city: 'JHAKHARI MAHADEV',
          district: 'PATNA',
          state: 'BIHAR',
          pincode: '801503',
          country: 'India',
        }
      }
    };

    const step1Data = {
      isBiharDomicile: true, // Bihar domicile maps here
      domicileCertificateNumber: 'BRCCO/2024/13884314',
      domicileCertificateAuthority: 'RO',
      domicileCertificateIssueDate: '28-10-2024',

      mainCategory: categoryId,
      subCategory: null,
      subSubCategoryId: null,
      categoryCertificateNumber: 'NCLCO/2025/81221',
      categoryCertificateAuthority: 'RO',
      categoryCertificateIssueDate: '06-02-2025',

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
      bsscAttempts: '00',
      contractualEmp: 'YES',
      nccCadet: 'NO',
      nonCreamyLayer: 'YES',
      pwd40Percent: 'NO',
      contractualPeriod: '14-09-14',
      postName: 'योजना सहायक',
      hasAgreement: 'YES',
      officeName: 'DFDFD',
      officeOrderNo: 'DFDFDF',
      isFreedomFighter: 'NO',
      isDebarred: 'NO'
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

    // 9. Update candidates table with the PDF values
    await db.update(candidates).set({
      dateOfBirth: dob,
    }).where(eq(candidates.id, candidate.id));
    console.log('- Updated candidate table dateOfBirth.');

    console.log('\n✅ Successfully set user application status to Step 1 Completed state!');
  } catch (error) {
    console.error('Operation failed:', error);
  } finally {
    await closeDb();
  }
}

main().catch(console.error);
