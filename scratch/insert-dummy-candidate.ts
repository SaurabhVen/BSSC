import { getDb, closeDb } from '../src/database/drizzle';
import {
  users,
  candidates,
  applications,
  documents,
  payments,
  applicationStepData,
  candidateQualifications,
  candidateExperiences,
  candidatePostPreferences,
  candidateLanguages,
  roles,
} from '../src/database/schema';
import { generateHash, generateRegistrationNumber } from '../src/utils/crypto';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('Connecting to database...');
  const db = getDb();

  try {
    const timestampStr = Date.now();
    const email = `dummy.candidate.${timestampStr}@example.com`;
    const password = 'Candidate@12345';
    const mobileNumber = `98765${String(timestampStr).slice(-5)}`;

    console.log(`Setting up candidate with email: ${email}`);

    // 1. Get role ID for 'candidate'
    const roleRows = await db.select().from(roles).where(eq(roles.name, 'candidate')).limit(1);
    if (roleRows.length === 0) {
      throw new Error("Role 'candidate' not found in database. Please run seeders first.");
    }
    const candidateRoleId = roleRows[0].id;

    // 2. Create User
    const passwordHash = await generateHash(password);
    const [insertedUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName: 'Dummy',
        lastName: 'Candidate',
        roleId: candidateRoleId,
        isActive: true,
      })
      .returning();
    console.log(`Created User ID: ${insertedUser.id}`);

    // 3. Create Candidate
    const regNo = generateRegistrationNumber('BSSC');
    const [insertedCandidate] = await db
      .insert(candidates)
      .values({
        userId: insertedUser.id,
        registrationNumber: regNo,
        dateOfBirth: new Date('1996-08-20'),
        mobileNumber,
        alternateNumber: '9123456789',
        mobileVerified: true,
        emailVerified: true,
      })
      .returning();
    console.log(`Created Candidate ID: ${insertedCandidate.id} with RegNo: ${regNo}`);

    // 4. Create Application (Submitted status)
    const [insertedApplication] = await db
      .insert(applications)
      .values({
        candidateId: insertedCandidate.id,
        status: 'submitted',
        currentStep: 7,
        completedSteps: [1, 2, 3, 4, 5, 6, 7],
        isSubmitted: true,
        applicationReferenceNumber: `REF-${regNo}`,
        submissionDate: new Date(),
      })
      .returning();
    console.log(`Created Application ID: ${insertedApplication.id}`);

    // 5. Create Documents
    const [insertedDoc1] = await db
      .insert(documents)
      .values({
        candidateId: insertedCandidate.id,
        documentType: 'photograph',
        fileName: 'photo.jpg',
        fileUrl: 'candidates/dummy/photograph/photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 45200,
        isVerified: false,
      })
      .returning();

    const [insertedDoc2] = await db
      .insert(documents)
      .values({
        candidateId: insertedCandidate.id,
        documentType: 'signature',
        fileName: 'sig.png',
        fileUrl: 'candidates/dummy/signature/sig.png',
        mimeType: 'image/png',
        fileSize: 12500,
        isVerified: false,
      })
      .returning();

    console.log('Inserted photograph & signature documents.');

    // 6. Create Step Data (1 to 7)
    const stepsData = [
      {
        stepNumber: 1,
        data: {
          title: 'Mr',
          firstName: 'Dummy',
          lastName: 'Candidate',
          fatherName: 'Father Candidate',
          motherName: 'Mother Candidate',
          dateOfBirth: '1996-08-20',
          gender: 'male',
          nationality: 'Indian',
          identityType: 'aadhaar',
          identityNumber: '123456789012',
          identificationMark1: 'Mole on left hand',
          mobileNumber,
          emailId: email,
          address: {
            permanent: {
              street: 'Flat 101, Dummy Residency',
              city: 'Ranchi',
              state: 'Jharkhand',
              pincode: '834001',
            },
          },
        },
      },
      {
        stepNumber: 2,
        data: {
          qualifications: [
            {
              level: '10th',
              degree: 'Matriculation',
              boardUniversity: 'CBSE',
              institutionName: 'Dummy Public School',
              yearOfPassing: 2012,
              totalMarks: 500,
              marksObtained: 450,
              percentage: '90.00',
              rollNumber: '1029384',
            },
            {
              level: '12th',
              degree: 'Intermediate',
              boardUniversity: 'CBSE',
              institutionName: 'Dummy Science College',
              yearOfPassing: 2014,
              totalMarks: 500,
              marksObtained: 420,
              percentage: '84.00',
              rollNumber: '1203948',
            },
          ],
        },
      },
      {
        stepNumber: 3,
        data: {
          experiences: [
            {
              designation: 'Project Associate',
              organization: 'Dummy Solutions Ltd',
              dateOfJoining: '2019-06-01',
              relievingDate: '2021-12-31',
              durationYears: 2,
              durationMonths: 6,
              experienceLetterNo: 'EXP-DUMMY-101',
            },
          ],
        },
      },
      {
        stepNumber: 4,
        data: {
          postPreferences: [
            { postCode: '1', priority: 1, isRegular: true, isBacklog: false },
            { postCode: '4', priority: 2, isRegular: true, isBacklog: false },
          ],
        },
      },
      {
        stepNumber: 5,
        data: {
          paperOneLanguage: 'Hindi',
          paperTwoLanguage: 'English',
          paperThreeLanguage: 'Sanskrit',
        },
      },
      {
        stepNumber: 6,
        data: {
          photograph: insertedDoc1.id,
          signature: insertedDoc2.id,
          declarationAccepted: true,
        },
      },
      {
        stepNumber: 7,
        data: {
          paymentStatus: 'completed',
          paymentAmount: 100,
          transactionId: 'TXN-DUMMY-998877',
        },
      },
    ];

    for (const step of stepsData) {
      await db.insert(applicationStepData).values({
        applicationId: insertedApplication.id,
        stepNumber: step.stepNumber,
        data: step.data,
      });
    }
    console.log('Inserted steps 1 to 7 application step data.');

    // 7. Insert Qualifications into candidateQualifications table
    await db.insert(candidateQualifications).values([
      {
        applicationId: insertedApplication.id,
        level: '10th',
        degree: 'Matriculation',
        boardUniversity: 'CBSE',
        institutionName: 'Dummy Public School',
        yearOfPassing: 2012,
        totalMarks: 500,
        marksObtained: 450,
        percentage: '90.00',
        rollNumber: '1029384',
      },
      {
        applicationId: insertedApplication.id,
        level: '12th',
        degree: 'Intermediate',
        boardUniversity: 'CBSE',
        institutionName: 'Dummy Science College',
        yearOfPassing: 2014,
        totalMarks: 500,
        marksObtained: 420,
        percentage: '84.00',
        rollNumber: '1203948',
      },
    ]);
    console.log('Inserted qualifications detail table rows.');

    // 8. Insert Experiences
    await db.insert(candidateExperiences).values({
      applicationId: insertedApplication.id,
      designation: 'Project Associate',
      organization: 'Dummy Solutions Ltd',
      dateOfJoining: new Date('2019-06-01'),
      relievingDate: new Date('2021-12-31'),
      durationYears: 2,
      durationMonths: 6,
      experienceLetterNo: 'EXP-DUMMY-101',
    });
    console.log('Inserted experience detail table rows.');

    // 9. Insert Post Preferences
    await db.insert(candidatePostPreferences).values([
      {
        applicationId: insertedApplication.id,
        postCode: '1',
        priority: 1,
        isRegular: true,
        isBacklog: false,
      },
      {
        applicationId: insertedApplication.id,
        postCode: '4',
        priority: 2,
        isRegular: true,
        isBacklog: false,
      },
    ]);
    console.log('Inserted post preferences detail table rows.');

    // 10. Insert Candidate Languages
    await db.insert(candidateLanguages).values({
      applicationId: insertedApplication.id,
      paperOneLanguage: 'Hindi',
      paperTwoLanguage: 'English',
      paperThreeLanguage: 'Sanskrit',
    });
    console.log('Inserted languages detail table rows.');

    // 11. Insert Payment
    await db.insert(payments).values({
      applicationId: insertedApplication.id,
      paymentOrderId: `ORDER-${timestampStr}`,
      amount: '100.00',
      currency: 'INR',
      transactionId: 'TXN-DUMMY-998877',
      status: 'completed',
      paymentMode: 'Net Banking',
      bankName: 'State Bank of India',
    });
    console.log('Inserted payments detail table rows.');

    console.log('\n==================================================');
    console.log('SUCCESS: Dummy candidate inserted fully successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Candidate ID: ${insertedCandidate.id}`);
    console.log(`Application ID: ${insertedApplication.id}`);
    console.log(`Reg No: ${regNo}`);
    console.log('==================================================\n');

  } catch (error) {
    console.error('Error seeding dummy candidate:', error);
  } finally {
    await closeDb();
  }
}

main();
