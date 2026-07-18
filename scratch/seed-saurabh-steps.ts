import dotenv from 'dotenv';
dotenv.config();

import { getDb, closeDb } from '../src/database/drizzle';
import { users, candidates, applications, applicationStepData } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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

    // 4. Clean up any existing step data to start fresh
    await db.delete(applicationStepData).where(eq(applicationStepData.applicationId, applicationId));
    console.log('Cleared existing step data.');

    // 5. Define mock payloads for steps 0 to 8
    const stepsPayloads: Record<number, Record<string, any>> = {
      0: {
        fullName: "Saurabh Mishra",
        fatherName: "Father Name",
        motherName: "Mother Name",
        dateOfBirth: "16-10-1999",
        gender: "male",
        maritalStatus: "unmarried",
        nationality: "Indian",
        identityType: "aadhaar",
        identityNumber: "123456789012",
        identificationMark1: "Mole on right cheek",
        identificationMark2: "",
        mobileNumber: "8382044417",
        alternateNumber: "",
        emailId: "saurabh+9@vensysco.in",
        address: {
          permanent: {
            street: "123 Test Street",
            post: "Test Post",
            district: "Patna",
            city: "Patna",
            state: "Bihar",
            pincode: "800001",
            country: "India"
          },
          correspondence: {
            sameAsPermanent: true
          }
        }
      },
      1: {
        mainCategory: 89,
        subCategory: null,
        subSubCategoryId: null,
        categoryCertificateNumber: "CAT12345",
        categoryCertificateAuthority: "CO",
        categoryCertificateIssueDate: "01-01-2025",
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
        isBiharDomicile: false,
        domicileCertificateNumber: "DOM12345",
        domicileCertificateAuthority: "CO",
        domicileCertificateIssueDate: "01-01-2025",
        isLocallyResident: true,
        localDistrictId: null,
        declaration: true
      },
      2: {
        highestQualification: "graduation",
        qualifications: [
          {
            level: "matriculation",
            boardUniversity: "CBSE",
            institutionName: "Test School",
            degree: "10th",
            specialization: "General",
            rollNumber: "1234567",
            yearOfPassing: 2015,
            totalMarks: 500,
            marksObtained: 450,
            percentage: 90,
            grade: "A"
          },
          {
            level: "graduation",
            boardUniversity: "Patna University",
            institutionName: "Science College",
            degree: "B.Sc",
            specialization: "Physics",
            rollNumber: "987654",
            yearOfPassing: 2020,
            totalMarks: 1000,
            marksObtained: 850,
            percentage: 85,
            grade: "A"
          }
        ]
      },
      3: {
        vacancyStream: "both",
        isRegular: true,
        isBacklog: false,
        postRankings: [
          {
            postCode: "1",
            priority: 1
          },
          {
            postCode: "2",
            priority: 2
          }
        ]
      },
      4: {
        photograph: "ae5016c6-947b-402a-96e0-ca469b9ee32e",
        signatureEnglish: "48f6d78f-9193-4fad-896d-842c09806ee7",
        signatureHindi: "fc05f384-ab4d-4f8f-83b6-5f008a9e4086"
      },
      5: {
        livePhoto: "92ffc9af-1ff6-4dce-835a-9b8fef102293"
      },
      6: {
        tenthMarksheet: "ba1b80f6-31e4-4aad-8948-aa395b9ad37f",
        twelfthMarksheet: "cbd6f54d-e55c-4b2e-87c9-0059bcadb0b1",
        graduationMarksheet: "50e7022d-f4cb-48b0-b4ed-8b090000f3cd",
        postGraduationCertificate: null,
        diplomaCertificate: null,
        experienceCertificate: null,
        contractualServiceCertificate: null,
        ewsCertificate: null,
        aadharCard: "fc05f384-ab4d-4f8f-83b6-5f008a9e4086",
        signature: "48f6d78f-9193-4fad-896d-842c09806ee7",
        photo: "ae5016c6-947b-402a-96e0-ca469b9ee32e",
        domicileCertificate: "8b3d8686-664c-4478-8f9e-9af819b51d0f",
        castCertificate: null,
        sportsCertificate: null,
        pwdCertificate: null,
        declarationAccepted: true
      },
      7: {
        paymentMode: "online_upi",
        feeCategory: "general"
      },
      8: {
        declarationAccepted: true,
        termsAccepted: true,
        confirmationText: "i confirm"
      }
    };

    // 6. Insert payloads
    for (const [stepNumberStr, data] of Object.entries(stepsPayloads)) {
      const stepNumber = parseInt(stepNumberStr);
      await db.insert(applicationStepData).values({
        id: uuidv4(),
        applicationId,
        stepNumber,
        data,
      });
      console.log(`- Inserted mock data for Step ${stepNumber}`);
    }

    // 7. Update application state to have all completed steps
    await db.update(applications).set({
      currentStep: 8,
      completedSteps: [0, 1, 2, 3, 4, 5, 6, 7],
      updatedAt: new Date(),
    }).where(eq(applications.id, applicationId));
    console.log('Updated application currentStep and completedSteps.');

    console.log('\n✅ Successfully seeded all step data for candidate!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await closeDb();
  }
}

main().catch(console.error);
