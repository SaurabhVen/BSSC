import { userRepository } from '../repositories/user.repository';
import { v4 as uuidv4 } from 'uuid';
import { captchaRepository, otpRepository } from '../repositories/common.repository';
import {
  compareHash,
  generateHash,
  generateRegistrationNumber,
  generateRandomToken,
} from '../utils/crypto';
import { forgotRegistrationNumberSchema, type ForgotRegistrationNumberInput } from '../validators/auth';
import { users, candidates } from '../database/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../database/drizzle';
import { notificationService } from './notification.service';

import { verifyCaptchaText } from '../utils/captcha';
import {
  cognitoLogin,
  cognitoRegister,
  cognitoRefreshToken,
  cognitoForgotPassword,
  cognitoConfirmForgotPassword,
  cognitoSignOut,
  type CognitoTokens,
  cognitoUpdateUserAttributes,
  cognitoAdminSetUserPassword,
} from '../utils/cognito';
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '../errors/AppError';
import type {
  LoginInput,
  RegisterInput,
  CandidateRegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  RefreshTokenInput,
  ChangePasswordInput,
} from '../validators/auth';
import type { User, Candidate } from '../database/schema';
import config from '../config';

import { log } from 'console';
export interface LoginResult {
  user: Omit<User, 'passwordHash'>;
  candidate: Candidate | null;
  tokens: CognitoTokens;
}

export interface RegisterResult {
  userId: string;
  candidateId?: string;
  registrationNumber?: string;
  email: string;
}

export class AuthService {
  // ── CAPTCHA ──────────────────────────────────────────────────

  async generateCaptcha(): Promise<{ captchaId: string; svg: string }> {
    const { generateCaptcha: generate } = await import('../utils/captcha');
    const { captchaId, svg, text } = generate();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    await captchaRepository.create({
      id: captchaId,
      code: text,
      expiresAt,
    });

    return { captchaId, svg };
  }

  async validateCaptcha(captchaId: string, text: string): Promise<void> {
    const record = await captchaRepository.findById(captchaId);
    if (!record) {
      throw new AppError(
        'The security code has expired. Please refresh the CAPTCHA and try again.',
        400
      );
    }

    await captchaRepository.delete(captchaId);

    if (record.expiresAt < new Date()) {
      throw new AppError(
        'The security code has expired. Please refresh the CAPTCHA and try again.',
        400
      );
    }

    const { verifyCaptchaText } = await import('../utils/captcha');
    if (!verifyCaptchaText(text, record.code)) {
      throw new AppError('The security code you entered is incorrect. Please try again.', 400);
    }
  }

  // ── Login ────────────────────────────────────────────────────

  async login(input: LoginInput): Promise<LoginResult> {
    await this.validateCaptcha(input.captchaId, input.captchaText);
    const user = await userRepository.findByEmail(input.email);
    if (!user)
      throw new UnauthorizedError(
        'The email address or password you entered is incorrect. Please check your details and try again.'
      );

    if (!user.isActive) {
      throw new AppError(
        'Your account is currently deactivated. Please contact our support team for assistance.',
        403
      );
    }

    const passwordValid = await compareHash(input.password, user.passwordHash);
    if (!passwordValid)
      throw new UnauthorizedError(
        'The email address or password you entered is incorrect. Please check your details and try again.'
      );

    let tokens: CognitoTokens;
    try {
      tokens = await cognitoLogin(input.email, input.password);
    } catch (cognitoError) {
      console.warn(
        'Cognito login failed, generating local fallback JWT:',
        (cognitoError as Error).message
      );
      const jwt = await import('jsonwebtoken');
      const userWithRole = await userRepository.findUserWithRole(user.id);
      const roleName = userWithRole?.roleName ?? 'candidate';
      const roleGroup = roleName.charAt(0).toUpperCase() + roleName.slice(1) + 's';
      tokens = {
        accessToken: jwt.default.sign(
          { sub: user.id, email: user.email, 'cognito:groups': [roleGroup] },
          config.JWT_SECRET,
          { expiresIn: 3600 }
        ),
        refreshToken: jwt.default.sign({ sub: user.id }, config.JWT_SECRET, {
          expiresIn: '30d',
        }),
        idToken: jwt.default.sign({ sub: user.id, email: user.email }, config.JWT_SECRET, {
          expiresIn: 3600,
        }),
        expiresIn: 3600,
      };
    }

    await userRepository.updateLastLogin(user.id);
    const candidate = await userRepository.findCandidateByUserId(user.id);

    const { passwordHash: _ph, ...safeUser } = user;
    return { user: safeUser as Omit<User, 'passwordHash'>, candidate, tokens };
  }

  // ── Register ─────────────────────────────────────────────────

  async register(input: RegisterInput): Promise<RegisterResult> {
    // if (!input.cognitoSubId) {
    //   await this.validateCaptcha(input.captchaId!, input.captchaText!);
    // }

    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError(
        'An account is already registered with this email address. Please log in or use a different email to register.'
      );
    }

    const { roles } = await import('../database/schema');
    const { getDb } = await import('../database/drizzle');
    const { eq } = await import('drizzle-orm');
    const db = getDb();

    // Determine the role
    const roleName = input.cognitoSubId ? 'admin' : 'candidate';
    const roleRows = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
    const targetRoleId = roleRows[0]?.id;
    if (!targetRoleId)
      throw new AppError(`System configuration error: ${roleName} role not found`, 500);

    // 1. Obtain user's Cognito sub ID
    let cognitoSub: string;
    if (input.cognitoSubId) {
      try {
        await cognitoUpdateUserAttributes(input.cognitoSubId, {
          name: input.fullName,
          phone_number: `+91${input.mobileNumber}`,
        });
        await cognitoAdminSetUserPassword(input.cognitoSubId, input.password);
        cognitoSub = input.cognitoSubId;
      } catch (err) {
        if (!config.MOCK_COGNITO) {
          throw new AppError(`Cognito registration failed: ${(err as Error).message}`, 400);
        }
        cognitoSub = input.cognitoSubId;
      }
    } else {
      try {
        const cognitoResult = await cognitoRegister(input.email, input.password, {
          name: input.fullName,
          phone_number: `+91${input.mobileNumber}`,
        });
        cognitoSub = cognitoResult.userSub;
      } catch (err) {
        if (!config.MOCK_COGNITO) {
          throw new AppError(`Cognito registration failed: ${(err as Error).message}`, 400);
        }
        const { v4: uuidv4 } = await import('uuid');
        cognitoSub = uuidv4();
      }
    }

    // 2. Create user locally using a locally generated UUID as the primary key
    const passwordHash = await generateHash(input.password);
    const user = await userRepository.create({
      id: uuidv4(),
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      roleId: targetRoleId,
    });

    if (roleName === 'candidate') {
      const registrationNumber = generateRegistrationNumber('BSSC');
      const candidate = await userRepository.createCandidate({
        userId: user.id,
        registrationNumber,
        dateOfBirth: input.dateOfBirth
          ? new Date(input.dateOfBirth.split('-').reverse().join('-'))
          : null,
        mobileNumber: input.mobileNumber ?? null,
        mobileVerified: false,
        emailVerified: false,
      });

      // 3. Update Cognito attributes with registration_no and preferred_username
      try {
        const { cognitoAdminUpdateUserAttributes } = await import('../utils/cognito');
        await cognitoAdminUpdateUserAttributes(input.email, {
          'custom:registration_no': registrationNumber,
          'preferred_username': registrationNumber,
        });

        // Optionally update custom:registration_number if defined
        try {
          await cognitoAdminUpdateUserAttributes(input.email, {
            'custom:registration_number': registrationNumber,
          });
        } catch (innerErr) {
          // Skip if custom:registration_number does not exist in pool schema
        }
      } catch (err) {
        console.warn(
          'Updating candidate attributes in Cognito failed (non-fatal):',
          (err as Error).message
        );
      }

      // 4. Send email to candidate with registration number and password
      try {
        const { notificationService } = await import('./notification.service');
        const emailTemplate = notificationService.renderRegistrationSuccessEmail({
          candidateName: input.fullName,
          applicationNo: registrationNumber,
          password: input.password,
          email: input.email,
        });
        await notificationService.sendEmail(input.email, emailTemplate.subject, emailTemplate.body);
        console.log(`[Registration Email] Successfully sent credentials to ${input.email}`);
      } catch (err) {
        console.warn(
          'Sending registration success email failed (non-fatal):',
          (err as Error).message
        );
      }

      return {
        userId: user.id,
        candidateId: candidate.id,
        registrationNumber,
        email: user.email,
      };
    }

    return {
      userId: user.id,
      email: user.email,
    };
  }

  async candidateRegister(input: CandidateRegisterInput): Promise<RegisterResult> {
    // try {
    //   await this.validateCaptcha(input.captchaId, input.captchaText);
    // } catch (err: any) {
    //   if (err.message === 'Incorrect CAPTCHA' || err.message === 'Invalid or expired CAPTCHA' || err.message === 'CAPTCHA has expired') {
    //     throw new ValidationError([{ field: 'captchaText', message: 'Incorrect CAPTCHA answer' }], 'Incorrect CAPTCHA answer');
    //   }
    //   throw err;
    // }
    // const congitoSub = await getUserByCognitoSubId(input.cognitoSubId);
    // const dbUser = await userRepository.findByCognitoSubId(input.cognitoSubId);
    // if (congitoSub && dbUser) {
    //   throw new ConflictError('User already exists');
    // }
    const dbUser = await userRepository.findByEmail(input.email);
    if (dbUser) {
      throw new ConflictError('User already exists');
    }

    const { roles } = await import('../database/schema');
    const { getDb } = await import('../database/drizzle');
    const { eq } = await import('drizzle-orm');
    const db = getDb();
    const roleRows = await db.select().from(roles).where(eq(roles.name, 'candidate')).limit(1);
    const candidateRoleId = roleRows[0]?.id;
    if (!candidateRoleId) {
      throw new AppError('System configuration error: candidate role not found', 500);
    }

    let cognitoSub: string;
    const nameParts = input.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Candidate';
    const lastName = nameParts.slice(1).join(' ') || 'Name';

    const cognitoAttrs: Record<string, string> = {
      given_name: firstName,
      family_name: lastName,
      name: input.fullName,
      phone_number: `+91${input.mobileNumber}`,
    };

    if (input.dateOfBirth) {
      const parts = input.dateOfBirth.split('-');
      if (parts.length === 3) {
        cognitoAttrs['birthdate'] = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    if ((input as any).gender) {
      cognitoAttrs['gender'] = (input as any).gender;
    }

    const customKeys = [
      'bihar_domicile',
      'bihar_govt_emp',
      'bssc_attempts',
      'caste',
      'category',
      'contractual_emp',
      'disability_type',
      'ex_serviceman',
      'is_pwd',
      'mobile_no',
      'non_creamy_layer',
      'pwd_40_percent',
      'contractual_period',
      'post_name',
      'has_agreement',
      'service_period',
      'dis_type_persist',
      'is_scribe_required',
      'organization_name',
      'has_post_experience',
      'serviceFromDate',
      'serviceToDate',
      'contractualFromDate',
      'contractualToDate',
      'isownscribe',
    ];

    for (const key of customKeys) {
      const val = (input as any)[key];
      if (val !== undefined && val !== null) {
        cognitoAttrs[`custom:${key}`] = String(val);
      }
    }

    try {
      const cognitoResult = await cognitoRegister(input.email, input.password, cognitoAttrs);
      cognitoSub = cognitoResult.userSub;
    } catch (err) {
      if (!config.MOCK_COGNITO) {
        throw new AppError(`Cognito registration failed: ${(err as Error).message}`, 400);
      }
      const { v4: uuidv4 } = await import('uuid');
      cognitoSub = uuidv4();
    }
    // try {
    //   await cognitoUpdateUserAttributes(input.cognitoSubId, {
    //     name: input.fullName,
    //     phone_number: `+91${input.mobileNumber}`,
    //   });
    //   await cognitoAdminSetUserPassword(input.cognitoSubId, input.password);
    //   cognitoSub = input.cognitoSubId;
    // } catch (err) {
    //   if (!config.MOCK_COGNITO) {
    //     throw new AppError(`Cognito registration failed: ${(err as Error).message}`, 400);
    //   }
    //   cognitoSub = input.cognitoSubId;
    // }

    const passwordHash = await generateHash(input.password);
    const user = await userRepository.create({
      id: uuidv4(),
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      roleId: candidateRoleId,
    });

    const registrationNumber = generateRegistrationNumber('BSSC');

    const isBiharDomicile = input.bihar_domicile === 'YES';
    const isPwd = input.is_pwd === 'YES';
    const isExsm = input.ex_serviceman === 'YES';
    const isBiharGovt = input.bihar_govt_emp === 'YES';
    const isContractual = input.contractual_emp === 'YES';
    const nonCreamy = input.non_creamy_layer === 'YES';
    const pwd40 = input.pwd_40_percent === 'YES';
    const hasAgreement = input.has_agreement === 'YES';

    const parsedAttempts = parseInt(input.bssc_attempts || '1', 10);
    const attempts = isNaN(parsedAttempts) ? 1 : parsedAttempts;

    const mapCategoryValue = (val: string): string => {
      const normalized = (val || '').toLowerCase().trim();
      if (normalized.includes('extremely backward') || normalized.includes('ebc') || normalized.includes('अत्यंत')) return 'ebc1';
      if (normalized.includes('backward class') || normalized.includes('bc') || normalized.includes('अनुसूची-2')) return 'bc2';
      if (normalized.includes('scheduled caste') || normalized.includes('sc') || normalized.includes('अनुसूचित जाति')) return 'sc';
      if (normalized.includes('scheduled tribe') || normalized.includes('st') || normalized.includes('अनुसूचित जनजाति')) return 'st';
      if (normalized.includes('unreserved') || normalized.includes('general') || normalized.includes('ur') || normalized.includes('गैर')) return 'unreserved';
      return normalized;
    };
    const categoryCode = mapCategoryValue(input.category || '');

    const candidate = await userRepository.createCandidate({
      userId: user.id,
      registrationNumber,
      dateOfBirth: new Date(input.dateOfBirth.split('-').reverse().join('-')),
      mobileNumber: input.mobileNumber,
      mobileVerified: true,
      emailVerified: true,

      // Custom BSSC Metadata fields mapped from candidate registration input
      gender: input.gender || null,
      category: categoryCode || null,
      caste: input.caste || null,
      biharDomicile: isBiharDomicile,
      isPwd: isPwd,
      disabilityType: input.disability_type || null,
      pwd40Percent: pwd40,
      isExServiceman: isExsm,
      isBiharGovtEmp: isBiharGovt,
      isContractualEmp: isContractual,
      bsscAttempts: attempts,
      nonCreamyLayer: nonCreamy,
      postName: input.post_name || null,
      hasAgreement: hasAgreement,
      contractualPeriod: input.contractual_period || null,
      servicePeriod: input.service_period || null,
      disTypePersist: input.dis_type_persist || null,
      isScribeRequired: input.is_scribe_required === 'YES',
      organizationName: input.organization_name || null,
      hasPostExperience: input.has_post_experience === 'YES',
    });

    try {
      const { cognitoAdminUpdateUserAttributes } = await import('../utils/cognito');
      await cognitoAdminUpdateUserAttributes(input.email, {
        'custom:registration_no': registrationNumber,
        'preferred_username': registrationNumber,
      });

      // Optionally update custom:registration_number if defined
      try {
        await cognitoAdminUpdateUserAttributes(input.email, {
          'custom:registration_number': registrationNumber,
        });
      } catch (innerErr) {
        // Skip if custom:registration_number does not exist in pool schema
      }
    } catch (err) {
      console.warn('Updating candidate attributes in Cognito failed (non-fatal):', (err as Error).message);
    }

    // Send email to candidate with registration number and password
    try {
      const { notificationService } = await import('./notification.service');
      const emailTemplate = notificationService.renderRegistrationSuccessEmail({
        candidateName: input.fullName,
        applicationNo: registrationNumber,
        password: input.password,
        email: input.email,
      });
      await notificationService.sendEmail(input.email, emailTemplate.subject, emailTemplate.body);
      console.log(`[Registration Email] Successfully sent credentials to ${input.email}`);
    } catch (err) {
      console.warn(
        'Sending registration success email failed (non-fatal):',
        (err as Error).message
      );
    }

    return {
      userId: user.id,
      candidateId: candidate.id,
      registrationNumber,
      email: user.email,
    };
  }

  // ── Refresh Token ────────────────────────────────────────────

  async refreshToken(input: RefreshTokenInput): Promise<CognitoTokens> {
    const user = await userRepository.findByEmail(input.email);
    if (!user)
      throw new UnauthorizedError('Your session has expired. Please log in again to continue.');
    return cognitoRefreshToken(input.email, input.refreshToken);
  }

  // ── Forgot Password ──────────────────────────────────────────

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    await this.validateCaptcha(input.captchaId, input.captchaText);
    const user = await userRepository.findByEmail(input.email);
    if (!user) return; // Security: don't reveal whether email exists
    await cognitoForgotPassword(input.email);
  }

  // ── Reset Password ────────────────────────────────────────────

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    if (config.MOCK_COGNITO) {
      // In mock mode, token is the userId
      const user = await userRepository.findById(input.token);
      if (!user)
        throw new AppError(
          'The password reset link is invalid or has expired. Please request a new one.',
          400
        );
      const passwordHash = await generateHash(input.newPassword);
      await userRepository.updatePassword(user.id, passwordHash);
      return;
    }
    await cognitoConfirmForgotPassword(
      input.token, // token = email in Cognito flow
      input.token,
      input.newPassword
    );
  }

  // ── Change Password ───────────────────────────────────────────

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user)
      throw new NotFoundError(
        'We could not find an account with these details. Please register a new account or check your information.'
      );

    const valid = await compareHash(input.currentPassword, user.passwordHash);
    if (!valid)
      throw new UnauthorizedError(
        'The current password you entered is incorrect. Please try again.'
      );

    const newHash = await generateHash(input.newPassword);
    await userRepository.updatePassword(userId, newHash);
  }

  // ── Seeding Dummy Data ───────────────────────────────────────

  async seedDummy(): Promise<any> {
    const { getDb } = await import('../database/drizzle');
    const { roles, users, candidates, applications, applicationStepData, documents, payments } =
      await import('../database/schema');
    const { eq, and } = await import('drizzle-orm');
    const { v4: uuidv4 } = await import('uuid');

    const db = getDb();

    // 1. Seed Roles
    const rolesToSeed = [
      { name: 'admin', description: 'System administrator with full access' },
      { name: 'candidate', description: 'Applicant filling the portal' },
      { name: 'reviewer', description: 'Reviewer who validates applications' },
    ];

    const rolesMap: Record<string, string> = {};
    for (const r of rolesToSeed) {
      const existingRole = await db.select().from(roles).where(eq(roles.name, r.name)).limit(1);
      if (existingRole.length === 0) {
        const inserted = await db.insert(roles).values(r).returning();
        rolesMap[r.name] = inserted[0].id;
      } else {
        rolesMap[r.name] = existingRole[0].id;
      }
    }

    // 2. Seed Admin User
    const adminEmail = 'admin@candidateportal.gov.in';
    const adminPassword = 'Admin@12345';
    const adminRecord = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    let adminId: string;
    if (adminRecord.length === 0) {
      const passwordHash = await generateHash(adminPassword);
      const inserted = await db
        .insert(users)
        .values({
          id: uuidv4(),
          email: adminEmail,
          passwordHash,
          fullName: 'System Admin',
          roleId: rolesMap['admin'],
          isActive: true,
        })
        .returning();
      adminId = inserted[0].id;
    } else {
      adminId = adminRecord[0].id;
    }

    // 3. Seed Candidate User
    const candidateEmail = 'candidate@example.com';
    const candidatePassword = 'Candidate@12345';
    const candidateUserRecord = await db
      .select()
      .from(users)
      .where(eq(users.email, candidateEmail))
      .limit(1);
    let candidateUserId: string;
    if (candidateUserRecord.length === 0) {
      const passwordHash = await generateHash(candidatePassword);
      const inserted = await db
        .insert(users)
        .values({
          id: uuidv4(),
          email: candidateEmail,
          passwordHash,
          fullName: 'Test Candidate',
          roleId: rolesMap['candidate'],
          isActive: true,
        })
        .returning();
      candidateUserId = inserted[0].id;
    } else {
      candidateUserId = candidateUserRecord[0].id;
    }

    // 4. Seed Candidate Record
    const candidateRecord = await db
      .select()
      .from(candidates)
      .where(eq(candidates.userId, candidateUserId))
      .limit(1);
    let candidateId: string;
    let registrationNumber: string;
    if (candidateRecord.length === 0) {
      registrationNumber = generateRegistrationNumber('BSSC');
      const inserted = await db
        .insert(candidates)
        .values({
          userId: candidateUserId,
          registrationNumber,
          dateOfBirth: new Date('2000-01-01'),
          mobileNumber: '9876543210',
          mobileVerified: true,
          emailVerified: true,
        })
        .returning();
      candidateId = inserted[0].id;
    } else {
      candidateId = candidateRecord[0].id;
      registrationNumber =
        candidateRecord[0].registrationNumber || generateRegistrationNumber('BSSC');
    }

    // 5. Fetch or Create Application
    const applicationRecord = await db
      .select()
      .from(applications)
      .where(eq(applications.candidateId, candidateId))
      .limit(1);
    let applicationId: string;
    if (applicationRecord.length === 0) {
      const inserted = await db
        .insert(applications)
        .values({
          candidateId,
          status: 'draft',
          currentStep: 0,
          completedSteps: [],
          isSubmitted: false,
        })
        .returning();
      applicationId = inserted[0].id;
    } else {
      applicationId = applicationRecord[0].id;
    }

    // 6. Create / Get Dummy Documents
    const documentTypes = [
      'photograph',
      'signature',
      'identityProof',
      'categoryProof',
      'educationProof',
    ];
    const docIdsMap: Record<string, string> = {};
    for (const type of documentTypes) {
      const existingDoc = await db
        .select()
        .from(documents)
        .where(and(eq(documents.candidateId, candidateId), eq(documents.documentType, type)))
        .limit(1);
      if (existingDoc.length === 0) {
        const inserted = await db
          .insert(documents)
          .values({
            candidateId,
            documentType: type,
            fileName: `${type}_dummy.pdf`,
            fileUrl: `https://dummy-bucket.s3.amazonaws.com/${candidateId}/${type}_dummy.pdf`,
            mimeType: 'application/pdf',
            fileSize: 1024,
            isVerified: true,
          })
          .returning();
        docIdsMap[type] = inserted[0].id;
      } else {
        docIdsMap[type] = existingDoc[0].id;
      }
    }

    // 7. Seed Step Data
    const step0Data = {
      fullName: 'Test Candidate',
      fatherName: 'Father Candidate',
      motherName: 'Mother Candidate',
      dateOfBirth: '2000-01-01',
      gender: 'male',
      nationality: 'Indian',
      identityType: 'aadhaar',
      identityNumber: '123456789012',
      maritalStatus: 'unmarried',
      address: {
        permanent: {
          street: '123 Main St',
          post: 'Ranchi',
          district: 'Ranchi',
          city: 'Ranchi',
          state: 'Jharkhand',
          pincode: '834001',
          country: 'India',
        },
        correspondence: {
          sameAsPermanent: true,
          street: '123 Main St',
          post: 'Ranchi',
          district: 'Ranchi',
          city: 'Ranchi',
          state: 'Jharkhand',
          pincode: '834001',
          country: 'India',
        },
      },
    };

    const step1Data = {
      category: 'general',
      isExServiceman: false,
      isPhysicallyHandicapped: false,
    };

    const step2Data = {
      qualifications: [
        {
          level: 'matriculation',
          boardUniversity: 'JAC Ranchi',
          institutionName: 'Ranchi High School',
          degree: '10th',
          yearOfPassing: 2016,
          totalMarks: 500,
          marksObtained: 420,
          percentage: 84,
        },
        {
          level: 'intermediate',
          boardUniversity: 'JAC Ranchi',
          institutionName: 'Ranchi College',
          degree: '12th',
          yearOfPassing: 2018,
          totalMarks: 500,
          marksObtained: 410,
          percentage: 82,
        },
      ],
    };

    const step3Data = {
      preferredPosts: [
        {
          postCode: 'POST001',
          postName: 'Assistant Section Officer',
          department: 'Personnel and Administrative Reforms',
          priority: 1,
        },
        {
          postCode: 'POST002',
          postName: 'Block Supply Officer',
          department: 'Food, Public Distribution and Consumer Affairs',
          priority: 2,
        },
      ],
    };

    const step4Data = {
      languages: [
        {
          language: 'Hindi',
          proficiency: 'native',
          read: true,
          write: true,
          speak: true,
        },
        {
          language: 'English',
          proficiency: 'advanced',
          read: true,
          write: true,
          speak: true,
        },
      ],
      mediumOfExam: 'hindi',
    };

    const step5Data = {
      centers: [
        {
          centreCode: 'C001',
          centreName: 'Ranchi Centre',
          state: 'Jharkhand',
          priority: 1,
        },
        {
          centreCode: 'C002',
          centreName: 'Jamshedpur Centre',
          state: 'Jharkhand',
          priority: 2,
        },
        {
          centreCode: 'C003',
          centreName: 'Dhanbad Centre',
          state: 'Jharkhand',
          priority: 3,
        },
      ],
    };

    const step6Data = {
      documents: {
        photograph: docIdsMap['photograph'],
        signature: docIdsMap['signature'],
        identityProof: docIdsMap['identityProof'],
        categoryProof: docIdsMap['categoryProof'],
        educationProof: docIdsMap['educationProof'],
      },
      declarationAccepted: true,
    };

    const step7Data = {
      paymentMode: 'online_card',
      feeCategory: 'general',
    };

    const step8Data = {
      declarationAccepted: true,
      termsAccepted: true,
      confirmationText: 'i confirm',
    };

    const stepsToUpsert = [
      { step: 0, data: step0Data },
      { step: 1, data: step1Data },
      { step: 2, data: step2Data },
      { step: 3, data: step3Data },
      { step: 4, data: step4Data },
      { step: 5, data: step5Data },
      { step: 6, data: step6Data },
      { step: 7, data: step7Data },
      { step: 8, data: step8Data },
    ];

    for (const s of stepsToUpsert) {
      const existingStep = await db
        .select()
        .from(applicationStepData)
        .where(
          and(
            eq(applicationStepData.applicationId, applicationId),
            eq(applicationStepData.stepNumber, s.step)
          )
        )
        .limit(1);
      if (existingStep.length === 0) {
        await db.insert(applicationStepData).values({
          applicationId,
          stepNumber: s.step,
          data: s.data,
        });
      } else {
        await db
          .update(applicationStepData)
          .set({
            data: s.data,
            updatedAt: new Date(),
          })
          .where(eq(applicationStepData.id, existingStep[0].id));
      }
    }

    // 8. Create Successful Payment
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.applicationId, applicationId))
      .limit(1);
    if (existingPayment.length === 0) {
      await db.insert(payments).values({
        applicationId,
        paymentOrderId: 'ORD_DUMMY_' + Date.now(),
        amount: '100.00',
        currency: 'INR',
        transactionId: 'TXN_DUMMY_' + Date.now(),
        status: 'success',
        paymentMode: 'online_card',
        bankName: 'Dummy Bank',
        gatewayResponse: { status: 'success', message: 'Dummy Payment Successful' },
      });
    } else if (existingPayment[0].status !== 'success') {
      await db
        .update(payments)
        .set({
          status: 'success',
          transactionId: 'TXN_DUMMY_' + Date.now(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, existingPayment[0].id));
    }

    // 9. Submit Application
    const completedSteps = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const referenceNumber = `BSSC${Date.now().toString(36).toUpperCase()}`;
    await db
      .update(applications)
      .set({
        isSubmitted: true,
        status: 'submitted',
        currentStep: 8,
        completedSteps,
        applicationReferenceNumber: referenceNumber,
        submissionDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));

    return {
      admin: {
        email: adminEmail,
        password: adminPassword,
      },
      candidate: {
        email: candidateEmail,
        password: candidatePassword,
        registrationNumber,
        applicationId,
        referenceNumber,
      },
    };
  }

  async forgotRegistrationNumber(input: ForgotRegistrationNumberInput): Promise<void> {
  const db = getDb();
  
  // 1. Find User and Candidate in Database
  const candidateRecord = await db
    .select({
      fullName: users.fullName,
      registrationNumber: candidates.registrationNumber,
    })
    .from(users)
    .innerJoin(candidates, eq(users.id, candidates.userId))
    .where(eq(users.email, input.email.toLowerCase().trim()))
    .limit(1);
  const candidate = candidateRecord[0];
  if (!candidate || !candidate.registrationNumber) {
    throw new NotFoundError('No candidate profile or registration number found for this email address.');
  }
  // 2. Prepare the Email Template
  const subject = 'Your BSSC Candidate Portal Registration Number';
  const body = `
    <html>
      <body>
        <p>Dear ${candidate.fullName || 'Candidate'},</p>
        <p>We received a request to retrieve your Registration Number for the BSSC Candidate Portal.</p>
        <p>Your Registration Number is: <strong>${candidate.registrationNumber}</strong></p>
        <p>Please keep this information safe. You will need it along with your password to log in and track your application status.</p>
        <p>If you did not make this request, please ignore this email.</p>
        <p>Best Regards,<br/>BSSC Portal Administration Team</p>
      </body>
    </html>
  `;
  // 3. Send the Email using SES (via NotificationService)
  await notificationService.sendEmail(input.email, subject, body);
}

  // ── Logout ────────────────────────────────────────────────────

  async logout(accessToken: string): Promise<void> {
    try {
      await cognitoSignOut(accessToken);
    } catch (err) {
      console.warn('Cognito sign-out failed (non-fatal):', (err as Error).message);
    }
  }
}

export const authService = new AuthService();
export default authService;
