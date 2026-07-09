import type { PostConfirmationTriggerEvent, Context } from 'aws-lambda';
import { userRepository } from '../../repositories/user.repository';
import { getDb } from '../../database/drizzle';
import { roles, documents, applications, applicationStepData, categories } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateRegistrationNumber } from '../../utils/crypto';
import { calculateBSSCAge } from '../../utils/age';


/**
 * AWS Lambda Cognito Post Confirmation Trigger Handler
 * 
 * Automatically synchronizes users to the local PostgreSQL database after they confirm
 * their signup in Cognito User Pool.
 */
export const handler = async (
  event: PostConfirmationTriggerEvent,
  context: Context
): Promise<PostConfirmationTriggerEvent> => {
  console.log('=== Cognito Post Confirmation DB Sync Initiated ===');
  console.log('User Sub ID:', event.userName);

  const attributes = event.request.userAttributes;
  const userSub = attributes['sub'] || event.userName;
  console.log('User Sub UUID:', userSub);

  const email = attributes['email'];
  const fullName = attributes['name'] || 'Candidate Name';
  const mobileNumber = attributes['phone_number'] || attributes['custom:mobile_no'] || '';
  const dateOfBirthStr = attributes['birthdate'] || ''; // Format: YYYY-MM-DD
  const documentUrl = attributes['custom:document_url'];

  if (!email) {
    console.error('Email attribute is missing in Cognito confirmation.');
    return event;
  }

  try {
    // 1. Check if user already exists locally in PostgreSQL database
    const existingUser = await userRepository.findByCognitoSubId(userSub);
    if (existingUser) {
      console.log(`User ${email} already exists in DB with Cognito Sub ID: ${userSub}`);

      const candidate = await userRepository.findCandidateByUserId(existingUser.id);
      if (candidate && candidate.registrationNumber) {
        console.log(`[Trigger] Existing candidate registration number is ${candidate.registrationNumber}. Updating Cognito custom attributes...`);
        try {
          const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } = await import(
            '@aws-sdk/client-cognito-identity-provider'
          );
          const cognitoClient = new CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'us-east-1',
          });
          await cognitoClient.send(
            new AdminUpdateUserAttributesCommand({
              UserPoolId: event.userPoolId,
              Username: event.userName,
              UserAttributes: [
                { Name: 'custom:registration_no', Value: candidate.registrationNumber },
                { Name: 'preferred_username', Value: candidate.registrationNumber },
              ],
            })
          );
          console.log(`[Trigger] Successfully updated registration_no and preferred_username for existing user in Cognito.`);

          try {
            await cognitoClient.send(
              new AdminUpdateUserAttributesCommand({
                UserPoolId: event.userPoolId,
                Username: event.userName,
                UserAttributes: [
                  { Name: 'custom:registration_number', Value: candidate.registrationNumber },
                ],
              })
            );
            console.log(`[Trigger] Successfully updated custom:registration_number for existing user in Cognito.`);
          } catch (innerErr) {
            console.log(`[Trigger] Optional custom:registration_number attribute update for existing user skipped/failed: ${(innerErr as Error).message}`);
          }
        } catch (err) {
          console.warn(
            '[Trigger] Updating registration attributes for existing user in Cognito failed (non-fatal):',
            (err as Error).message
          );
        }
      } else {
        console.warn(`[Trigger] Existing user candidate record or registration number was not found for user ID: ${existingUser.id}`);
      }

      return event;
    }

    const db = getDb();

    // 2. Fetch role ID for candidate
    let roleId: string;
    const roleRows = await db.select().from(roles).where(eq(roles.name, 'candidate')).limit(1);
    if (roleRows.length > 0) {
      roleId = roleRows[0].id;
    } else {
      const inserted = await db
        .insert(roles)
        .values({
          id: uuidv4(),
          name: 'candidate',
          description: 'Applicant filling the portal',
        })
        .returning();
      roleId = inserted[0].id;
    }

    // 3. Create user locally, using Cognito sub ID as the primary key id
    const user = await userRepository.create({
      id: userSub,
      email: email.toLowerCase().trim(),
      passwordHash: 'COGNITO_CONFIRMED_USER', // Federated or Cognito-validated user indicator
      fullName,
      roleId,
      cognitoSubId: userSub,
      isActive: true,
    });

    // 4. Create candidate locally
    const registrationNumber = generateRegistrationNumber('BSSC');
    const cleanedMobile = mobileNumber ? mobileNumber.replace(/^\+91/, '') : null;

    let dob: Date | null = null;
    if (dateOfBirthStr) {
      const parsedDob = new Date(dateOfBirthStr);
      if (!isNaN(parsedDob.getTime())) {
        dob = parsedDob;
      }
    }

    const candidate = await userRepository.createCandidate({
      id: uuidv4(),
      userId: user.id,
      registrationNumber,
      dateOfBirth: dob,
      mobileNumber: cleanedMobile,
      mobileVerified: true,
      emailVerified: true,
    });

    // 4.1 Create application draft
    const applicationId = uuidv4();
    await db.insert(applications).values({
      id: applicationId,
      candidateId: candidate.id,
      status: 'draft',
      currentStep: 0,
      completedSteps: [],
      isSubmitted: false,
    });

    // 4.2 Map Cognito attributes to Step 0 (Personal Info)
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

    // 4.3 Map Cognito attributes to Step 1 (Reservation Category)
    let categoryId: number | null = null;
    const cognitoCategoryValue = (attributes['custom:category'] || '').toLowerCase();
    const catRows = await db
      .select()
      .from(categories)
      .where(eq(categories.catValue, cognitoCategoryValue === 'ur' ? 'unreserved' : cognitoCategoryValue))
      .limit(1);

    if (catRows.length > 0) {
      categoryId = catRows[0].catId;
    } else {
      const defaultCat = await db
        .select()
        .from(categories)
        .where(eq(categories.catValue, 'unreserved'))
        .limit(1);
      if (defaultCat.length > 0) {
        categoryId = defaultCat[0].catId;
      }
    }

    const step1Data = {
      isJharkhandDomicile: attributes['custom:bihar_domicile'] === 'YES',
      domicileCertificateNumber: null,
      domicileCertificateAuthority: null,
      domicileCertificateIssueDate: null,

      mainCategory: categoryId,
      subCategory: null,
      subSubCategoryId: null,
      categoryCertificateNumber: null,
      categoryCertificateAuthority: null,
      categoryCertificateIssueDate: null,

      isPwd: attributes['custom:is_pwd'] === 'YES',
      pwdType: null,
      pwdPercentage: null,
      pwdCertificateNumber: null,
      pwdCertificateAuthority: null,
      pwdCertificateIssueDate: null,

      isExServiceman: attributes['custom:ex_serviceman'] === 'YES',
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

      // Custom metadata from Cognito
      biharGovtEmp: attributes['custom:bihar_govt_emp'] || 'NO',
      bsscAttempts: attributes['custom:bssc_attempts'] || '1',
      contractualEmp: attributes['custom:contractual_emp'] || 'NO',
      nccCadet: attributes['custom:ncc_cadet'] || 'NO',
      nonCreamyLayer: attributes['custom:non_creamy_layer'] || 'NO',
      pwd40Percent: attributes['custom:pwd_40_percent'] || 'NO',
      contractualPeriod: attributes['custom:contractual_period'] || 'NO',
      postName: attributes['custom:post_name'] || '',
      hasAgreement: attributes['custom:has_agreement'] || 'NO',
    };

    // 4.4 Save step data
    await db.insert(applicationStepData).values({
      id: uuidv4(),
      applicationId: applicationId,
      stepNumber: 0,
      data: step0Data,
    });

    await db.insert(applicationStepData).values({
      id: uuidv4(),
      applicationId: applicationId,
      stepNumber: 1,
      data: step1Data,
    });

    // 5. Create document locally if document URL is present
    if (documentUrl) {
      const documentId = uuidv4();
      await db.insert(documents).values({
        id: documentId,
        candidateId: candidate.id,
        documentType: 'registration_document',
        fileName: 'registration_document.pdf',
        fileUrl: documentUrl,
        mimeType: 'application/pdf',
        fileSize: 1024,
        isVerified: true,
      });
    }

    // 6. Update Cognito attributes with registration_no
    try {
      const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } = await import(
        '@aws-sdk/client-cognito-identity-provider'
      );
      const cognitoClient = new CognitoIdentityProviderClient({
        region: process.env.AWS_REGION || 'us-east-1',
      });
      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: event.userPoolId,
          Username: event.userName,
          UserAttributes: [
            { Name: 'custom:registration_no', Value: registrationNumber },
            { Name: 'preferred_username', Value: registrationNumber },
          ],
        })
      );
      console.log(`[Trigger] Successfully updated registration_no and preferred_username in Cognito.`);

      try {
        await cognitoClient.send(
          new AdminUpdateUserAttributesCommand({
            UserPoolId: event.userPoolId,
            Username: event.userName,
            UserAttributes: [
              { Name: 'custom:registration_number', Value: registrationNumber },
            ],
          })
        );
        console.log(`[Trigger] Successfully updated custom:registration_number in Cognito.`);
      } catch (innerErr) {
        console.log(`[Trigger] Optional custom:registration_number attribute update skipped/failed: ${(innerErr as Error).message}`);
      }
    } catch (err) {
      console.warn(
        '[Trigger] Updating registration attributes in Cognito failed (non-fatal):',
        (err as Error).message
      );
    }

    // 7. Send registration success email with registration number
    try {
      const { notificationService } = await import('../../services/notification.service');
      const emailTemplate = notificationService.renderRegistrationSuccessEmail({
        candidateName: fullName,
        applicationNo: registrationNumber,
        password: '(आपके द्वारा रजिस्ट्रेशन के दौरान सेट किया गया पासवर्ड / Password set during registration)',
        email: email,
      });
      await notificationService.sendEmail(email, emailTemplate.subject, emailTemplate.body);
      console.log(`[Trigger] Sent registration success email with registration_no to ${email}`);
    } catch (err) {
      console.warn(
        '[Trigger] Sending registration success email failed (non-fatal):',
        (err as Error).message
      );
    }

    console.log(`[Trigger] Successfully synced Cognito user ${email} and created candidate record.`);
    return event;
  } catch (error) {
    console.error('[Trigger] Failed to sync user to database:', error);
    throw error;
  }
};
