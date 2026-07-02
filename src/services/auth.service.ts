import { userRepository } from '../repositories/user.repository';
import { captchaRepository, otpRepository } from '../repositories/common.repository';
import {
  compareHash,
  generateHash,
  generateRegistrationNumber,
  generateRandomToken,
} from '../utils/crypto';
import { verifyCaptchaText } from '../utils/captcha';
import {
  generateTokens,
} from '../utils/jwt';
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

export interface LocalTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  user: Omit<User, 'passwordHash'>;
  candidate: Candidate | null;
  tokens: LocalTokens;
}

export interface RegisterResult {
  userId: string;
  candidateId?: string;
  registrationNumber?: string;
  email: string;
}
export const generateRandomPassword = (): string => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `BSSC@${random}`;
};

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

    const userWithRole = await userRepository.findUserWithRole(user.id);
    const roleName = userWithRole?.roleName ?? 'candidate';
    
    const tokens = generateTokens(user.id, user.email, [roleName]);

    await userRepository.updateLastLogin(user.id);
    const candidate = await userRepository.findCandidateByUserId(user.id);

    const { passwordHash: _ph, ...safeUser } = user;
    return { user: safeUser as Omit<User, 'passwordHash'>, candidate, tokens };
  }

  // ── Register ─────────────────────────────────────────────────

  async register(input: RegisterInput): Promise<RegisterResult> {
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
    const roleName = 'candidate';
    const roleRows = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
    const targetRoleId = roleRows[0]?.id;
    if (!targetRoleId)
      throw new AppError(`System configuration error: ${roleName} role not found`, 500);

    const { v4: uuidv4 } = await import('uuid');
    const userId = uuidv4();

    
    // Create user locally
    const generatedPassword = generateRandomPassword();
    console.log(`[Generated Password for ${input.email}]: ${generatedPassword}`);
    const passwordHash = await generateHash(generatedPassword);
    const user = await userRepository.create({
      id: userId,
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      roleId: targetRoleId,
    });

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

    return {
      userId: user.id,
      candidateId: candidate.id,
      registrationNumber,
      email: user.email,
    };
  }

  async candidateRegister(input: CandidateRegisterInput): Promise<RegisterResult> {
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
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

    const { v4: uuidv4 } = await import('uuid');
    const userId = uuidv4();
    const passwordHash = await generateHash(generateRandomPassword());
    const user = await userRepository.create({
      id: userId,
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      roleId: candidateRoleId,
    });

    const registrationNumber = generateRegistrationNumber('BSSC');
    const candidate = await userRepository.createCandidate({
      userId: user.id,
      registrationNumber,
      dateOfBirth: new Date(input.dateOfBirth.split('-').reverse().join('-')),
      mobileNumber: input.mobileNumber,
      mobileVerified: true,
      emailVerified: true,
    });

    return {
      userId: user.id,
      candidateId: candidate.id,
      registrationNumber,
      email: user.email,
    };
  }

  // ── Refresh Token ────────────────────────────────────────────

  async refreshToken(input: RefreshTokenInput): Promise<LocalTokens> {
    const user = await userRepository.findByEmail(input.email);
    if (!user)
      throw new UnauthorizedError('Your session has expired. Please log in again to continue.');
    
    const jwt = await import('jsonwebtoken');
    try {
      jwt.default.verify(input.refreshToken, config.JWT_SECRET);
    } catch (err) {
      throw new UnauthorizedError('Your session has expired. Please log in again to continue.');
    }

    const userWithRole = await userRepository.findUserWithRole(user.id);
    const roleName = userWithRole?.roleName ?? 'candidate';

    return generateTokens(user.id, user.email, [roleName]);
  }

  // ── Forgot Password  ──────────────────────────────────────────

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    await this.validateCaptcha(input.captchaId, input.captchaText);
    const user = await userRepository.findByEmail(input.email);
    if (!user) return; // Security: don't reveal whether email exists
    
    const jwt = await import('jsonwebtoken');
    const resetToken = jwt.default.sign(
      { userId: user.id, purpose: 'reset-password' },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    );
    console.log(`[Reset Token generated for ${user.email}]: ${resetToken}`);
  }

  // ── Reset Password ────────────────────────────────────────────

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const jwt = await import('jsonwebtoken');
    let decoded: any;
    try {
      decoded = jwt.default.verify(input.token, config.JWT_SECRET);
    } catch (err) {
      throw new AppError(
        'The password reset link is invalid or has expired. Please request a new one.',
        400
      );
    }

    if (decoded.purpose !== 'reset-password') {
      throw new AppError('The password reset link is invalid.', 400);
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new AppError('The account was not found.', 400);
    }

    const passwordHash = await generateHash(input.newPassword);
    await userRepository.updatePassword(user.id, passwordHash);
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

  // ── Logout ────────────────────────────────────────────────────

  async logout(accessToken: string): Promise<void> {
    // Stateless JWT logout (handled on frontend by discarding the token)
  }
}

export const authService = new AuthService();
export default authService;
