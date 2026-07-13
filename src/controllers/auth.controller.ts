import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { authService } from '../services/auth.service';
import { otpService } from '../services/otp.service';
import { userRepository } from '../repositories/user.repository';
import { response } from '../helpers/response';
import { parseEvent, getAuthorizationToken } from '../helpers/request';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  loginSchema,
  validateCaptchaSchema,
  registerSchema,
  candidateRegisterSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  changePasswordSchema,
  sendMobileOtpSchema,
  verifyMobileOtpSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  resendOtpSchema,
  candidateStep1Schema,
  candidateStep2Schema,
  candidateStep3Schema,
  candidateStep4Schema,
  candidateStep5Schema,
  candidateStep6Schema,
  type CandidateRegisterInput,
} from '../validators/auth';
import { applicationService } from '../services/application.service';
import { documentService } from '../services/document.service';
import { documentRepository } from '../repositories/common.repository';
import { parseMultipart } from '../helpers/multipart';
import {
  NotFoundError,
  ValidationError,
  UnsupportedMediaTypeError,
  AppError,
} from '../errors/AppError';
import type { LambdaResponse } from '../types';
import { getDb } from '../database/drizzle';
import {
  applications,
  applicationStepData,
  posts,
  educations,
  subjects,
  categories,
  jobQualifications,
} from '../database/schema';
import { eq, asc, or, inArray, and } from 'drizzle-orm';
import { calculateBSSCAge, getBSSCAgeLimits, checkBSSCEligibility } from '../utils/age';

interface UnifiedCandidate {
  dob?: string;
  gender?: string;
  nationality?: string;
  isIndianCitizen: boolean;
  isPwD?: boolean;
  category?: string;
  categoryName?: string;
  hasJharkhandDomicile: boolean;
  stream: string;
  highestQualification?: string;
  education?: {
    degree: string;
    subject: string;
  };
}

function evaluateAgeLimits(
  age: number,
  categoryInput: string,
  categoryName: string,
  gender: string,
  isPwD: boolean
): boolean {
  if (age < 21) return false;

  let maxAge = 35;
  const catStr = (String(categoryInput) + ' ' + String(categoryName)).toUpperCase();
  const genStr = String(gender).toUpperCase();

  if (catStr.includes('SC') || catStr.includes('ST') || catStr === '54') {
    maxAge = 40;
  } else if (catStr.includes('BC') || catStr.includes('OBC') || catStr.includes('EBC')) {
    maxAge = genStr === 'FEMALE' ? 38 : 37;
  } else if (genStr === 'FEMALE') {
    maxAge = 38;
  }

  if (isPwD) maxAge += 10;

  return age <= maxAge;
}

function resolveJobQualificationId(
  level: string,
  degreeOrCourse: string,
  specializationOrSubject: string,
  providedId?: number
): number | undefined {
  if (providedId) return providedId;

  const deg = degreeOrCourse.toLowerCase();
  const spec = specializationOrSubject.toLowerCase();

  if (level === 'matriculation') {
    return 52; // Matriculation (Class X)
  }
  if (level === 'diploma') {
    if (deg.includes('pharmacy') || spec.includes('pharmacy')) {
      return 53; // Diploma in Pharmacy
    }
    if (
      deg.includes('chemists') ||
      deg.includes('ici') ||
      spec.includes('chemists') ||
      spec.includes('ici')
    ) {
      return 54; // Associateship Diploma (with Chemistry/Pharmaceutics)
    }
  }
  if (level === 'post_graduation') {
    if (deg.includes('entomo') || spec.includes('entomo')) {
      return 1; // Post Graduate in Entomology / Zoology
    }
    return 46; // Post Graduate general
  }
  if (level === 'graduation') {
    if (deg.includes('dairy') || spec.includes('dairy')) {
      return 25; // Bachelor of Dairy Technology / Dairy Science
    }
    if (
      deg.includes('fisheries') ||
      deg.includes('fish') ||
      spec.includes('fisheries') ||
      spec.includes('fish')
    ) {
      return 26; // Bachelor of Fisheries Science
    }
    if (deg.includes('bsc') || deg.includes('b.sc') || deg.includes('science')) {
      if (spec.includes('math')) return 9; // B.Sc. Math
      if (spec.includes('zoology')) return 2; // B.Sc. Zoology
      if (spec.includes('botany')) return 4; // B.Sc. Botany
      if (spec.includes('physics')) return 49; // B.Sc. Physics
      if (spec.includes('chemistry')) return 51; // B.Sc. Chemistry
      if (spec.includes('statistics')) return 12; // B.Sc. Statistics
      if (spec.includes('geology')) return 14; // B.Sc. Geology
      if (spec.includes('economics')) return 18; // B.Sc. Economics
    }
    if (deg.includes('ba') || deg.includes('b.a') || deg.includes('arts')) {
      if (spec.includes('math')) return 19; // B.A. Math
      if (spec.includes('economics')) return 21; // B.A. Economics
      if (spec.includes('statistics')) return 20; // B.A. Statistics
    }
    if (deg.includes('bcom') || deg.includes('b.com') || deg.includes('commerce')) {
      if (spec.includes('math')) return 22; // B.Com Math
      if (spec.includes('economics')) return 24; // B.Com Economics
      if (spec.includes('statistics')) return 23; // B.Com Statistics
      return 37; // B.Com Commerce
    }
  }

  return undefined;
}

export class AuthController {
  // ── GET /auth/captcha ─────────────────────────────────────────

  async getCaptcha(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const captcha = await authService.generateCaptcha();
    return response.success(200, {
      message: 'CAPTCHA generated',
      captchaId: captcha.captchaId,
      captchaSvg: captcha.svg,
    });
  }

  // ── POST /auth/captcha/validate ───────────────────────────────

  async validateCaptcha(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(validateCaptchaSchema, body);
    await authService.validateCaptcha(input.captchaId, input.captchaText);
    return response.success(200, {
      message: 'CAPTCHA validated successfully',
    });
  }

  // ── POST /auth/login ──────────────────────────────────────────

  async login(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(loginSchema, body);
    const result = await authService.login(input);
    return response.success(200, {
      message: 'Login successful',
      user: {
        userId: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
      },
      candidate: result.candidate
        ? {
          candidateId: result.candidate.id,
          registrationNumber: result.candidate.registrationNumber,
        }
        : null,
      tokens: result.tokens,
    });
  }

  // ── POST /auth/register ───────────────────────────────────────

  async register(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(registerSchema, body);
    const result = await authService.register(input);
    const isCandidate = !input.cognitoSubId;
    return response.created({
      message: isCandidate
        ? 'Registration successful. Please verify your mobile and email.'
        : 'Admin registration successful.',
      userId: result.userId,
      candidateId: result.candidateId,
      registrationNumber: result.registrationNumber,
      email: result.email,
    });
  }

  // ── POST /auth/candidate/register ─────────────────────────────

  async candidateRegister(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);

    const input = validate(candidateRegisterSchema, body) as CandidateRegisterInput;

    const result = await authService.candidateRegister(input);
    return response.created({
      message: 'Candidate registration successful.',
      candidateId: result.candidateId,
      registrationNumber: result.registrationNumber,
      mobileVerified: false,
      emailVerified: true,
    });
  }

  // ── POST /auth/candidate/step-1 ───────────────────────────────

  async candidateStep1(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const rawBody = parseEvent(event).body as any;

    // Normalize flat payload if necessary
    let body = rawBody;
    if (rawBody && typeof rawBody === 'object' && !rawBody.personalInfo && rawBody.fullName) {
      body = {
        personalInfo: {
          fullName: rawBody.fullName,
          fathersName: rawBody.fatherName || rawBody.fathersName,
          motherName: rawBody.motherName,
          dob: rawBody.dateOfBirth
            ? (rawBody.dateOfBirth.includes('-') && rawBody.dateOfBirth.split('-')[0].length === 4
                ? rawBody.dateOfBirth.split('-').reverse().join('-')
                : rawBody.dateOfBirth)
            : '16-10-1999',
          gender: rawBody.gender || 'MALE',
          nationality: rawBody.nationality || 'Indian',
          aadharNumber: rawBody.aadharCardNumber || rawBody.idProofNo || '',
          identificationMark1: rawBody.identificationMarkEn || '',
          identificationMark2: '',
          mobileNumber: rawBody.mobileNo || rawBody.mobileNumber || '',
          alternateNumber: rawBody.alternateNo || '',
          maritalStatus: rawBody.isMarried === 'NO' ? 'unmarried' : rawBody.isMarried === 'YES' ? 'married' : (rawBody.isMarried || ''),
          emailId: rawBody.emailId || '',
          permanentAddress: {
            street: rawBody.permVillage || '',
            post: rawBody.permPostOffice || '',
            district: rawBody.permDistrict || '',
            cityOrVillage: rawBody.permVillage || '',
            state: rawBody.permState || '',
            pincode: rawBody.permPinCode || '',
          },
          sameAsPermanent: rawBody.sameAsPermanent === true || rawBody.sameAsPermanent === 'true',
          correspondenceAddress: {
            street: rawBody.corrVillage || '',
            post: rawBody.corrPostOffice || '',
            district: rawBody.corrDistrict || '',
            cityOrVillage: rawBody.corrVillage || '',
            state: rawBody.corrState || '',
            pincode: rawBody.corrPinCode || '',
          },
          spouseName: rawBody.spouseName || '',
        },
        reservationCategory: {
          isBiharDomicile: rawBody.domicileOfBihar === 'YES' || rawBody.isBiharDomicile === true || rawBody.isBiharDomicile === 'true',
          domicileCertificateNumber: rawBody.domicileCertNo || null,
          domicileCertificateAuthority: rawBody.domicileAuthority || null,
          domicileCertificateIssueDate: rawBody.domicileIssueDate
            ? (rawBody.domicileIssueDate.includes('-') && rawBody.domicileIssueDate.split('-')[0].length === 4
                ? rawBody.domicileIssueDate.split('-').reverse().join('-')
                : rawBody.domicileIssueDate)
            : null,
          mainCategory: rawBody.categoryId ? parseInt(String(rawBody.categoryId)) : 1,
          subCategory: null,
          subSubCategoryId: null,
          categoryCertificateNumber: rawBody.categoryCertNo || null,
          categoryCertificateAuthority: rawBody.categoryAuthority || null,
          categoryCertificateIssueDate: rawBody.categoryIssueDate
            ? (rawBody.categoryIssueDate.includes('-') && rawBody.categoryIssueDate.split('-')[0].length === 4
                ? rawBody.categoryIssueDate.split('-').reverse().join('-')
                : rawBody.categoryIssueDate)
            : null,
          isPwd: rawBody.disability === 'YES' || rawBody.isPwd === true || rawBody.isPwd === 'true',
          pwdType: null,
          pwdPercentage: null,
          pwdCertificateNumber: null,
          pwdCertificateAuthority: null,
          pwdCertificateIssueDate: null,
          isExServiceman: rawBody.exServiceman === 'YES' || rawBody.isExServiceman === true || rawBody.isExServiceman === 'true',
          exServicemanYears: null,
          isSportsQuota: false,
          sportsLevel: '',
          sportsAchievement: '',
          sportsCertificateNumber: '',
          sportsCertificateAuthority: '',
          sportsCertificateIssueDate: '',
          declaration: true,
        }
      };
    }

    // Pre-calculate age if it is falsy (0, null, undefined) before validation
    if (
      body &&
      typeof body === 'object' &&
      body.personalInfo &&
      typeof body.personalInfo === 'object'
    ) {
      const pi = body.personalInfo as any;
      if (pi.dob && typeof pi.dob === 'string') {
        let parsedDobStr = pi.dob;
        if (pi.dob.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const parts = pi.dob.split('-');
          parsedDobStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        const dobDate = new Date(parsedDobStr);
        if (!isNaN(dobDate.getTime())) {
          const calculatedAge = calculateBSSCAge(dobDate);
          if (pi.age === undefined || pi.age === null || pi.age === 0) {
            pi.age = calculatedAge;
          }
        }
      }
    }

    const input = validate(candidateStep1Schema, body) as any;
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const dobParts = input.personalInfo.dob.split('-');
    const dobDate = new Date(`${dobParts[2]}-${dobParts[1]}-${dobParts[0]}`);

    const isEligibleMinAge = checkBSSCEligibility(dobDate, 21, 150);
    if (!isEligibleMinAge) {
      throw new ValidationError([], 'Candidate must be at least 21 years old as of 01-08-2025');
    }

    const mappedAddress: any = {
      permanent: {
        street: input.personalInfo.permanentAddress.street,
        post: input.personalInfo.permanentAddress.post,
        city: input.personalInfo.permanentAddress.cityOrVillage,
        district: input.personalInfo.permanentAddress.district,
        state: input.personalInfo.permanentAddress.state,
        pincode: input.personalInfo.permanentAddress.pincode,
        country: 'India',
      },
    };

    if (input.personalInfo.sameAsPermanent) {
      mappedAddress.correspondence = {
        sameAsPermanent: true,
        street: mappedAddress.permanent.street,
        post: mappedAddress.permanent.post,
        city: mappedAddress.permanent.city,
        district: mappedAddress.permanent.district,
        state: mappedAddress.permanent.state,
        pincode: mappedAddress.permanent.pincode,
        country: 'India',
      };
    } else if (input.personalInfo.correspondenceAddress) {
      mappedAddress.correspondence = {
        sameAsPermanent: false,
        street: input.personalInfo.correspondenceAddress.street,
        post: input.personalInfo.correspondenceAddress.post,
        city: input.personalInfo.correspondenceAddress.cityOrVillage,
        district: input.personalInfo.correspondenceAddress.district,
        state: input.personalInfo.correspondenceAddress.state,
        pincode: input.personalInfo.correspondenceAddress.pincode,
        country: 'India',
      };
    }

    const mappedPersonalInfo = {
      fullName: input.personalInfo.fullName,
      fatherName: input.personalInfo.fathersName,
      motherName: input.personalInfo.motherName,
      dateOfBirth: input.personalInfo.dob,
      age: input.personalInfo.age || calculateBSSCAge(dobDate),
      gender: input.personalInfo.gender,
      maritalStatus: input.personalInfo.maritalStatus || null,
      spouseName: input.personalInfo.spouseName,
      nationality: input.personalInfo.nationality,
      identityType: 'aadhaar' as const,
      identityNumber: input.personalInfo.aadharNumber,
      identificationMark1: input.personalInfo.identificationMark1,
      identificationMark2: input.personalInfo.identificationMark2,
      mobileNumber: input.personalInfo.mobileNumber,
      alternateNumber: input.personalInfo.alternateNumber,
      emailId: input.personalInfo.emailId,
      address: mappedAddress,
    };

    const rc = input.reservationCategory;
    const mappedReservation = {
      mainCategory: rc.mainCategory,
      subCategory: rc.subCategory,
      subSubCategoryId: rc.subSubCategoryId ?? null,
      categoryCertificateNumber: rc.categoryCertificateNumber ?? null,
      categoryCertificateAuthority: rc.categoryCertificateAuthority ?? null,
      categoryCertificateIssueDate: rc.categoryCertificateIssueDate ?? null,

      isPwd: rc.isPwd,
      pwdType: rc.isPwd ? (rc.pwdType ?? null) : null,
      pwdPercentage: rc.isPwd ? (rc.pwdPercentage ?? null) : null,
      pwdCertificateNumber: rc.isPwd ? (rc.pwdCertificateNumber ?? null) : null,
      pwdCertificateAuthority: rc.isPwd ? (rc.pwdCertificateAuthority ?? null) : null,
      pwdCertificateIssueDate: rc.isPwd ? (rc.pwdCertificateIssueDate ?? null) : null,

      isExServiceman: rc.isExServiceman,
      exServicemanYears: rc.isExServiceman ? (rc.exServicemanYears ?? null) : null,

      isSportsQuota: rc.isSportsQuota,
      sportsLevel: rc.isSportsQuota ? (rc.sportsLevel ?? null) : null,
      sportsAchievement: rc.isSportsQuota ? (rc.sportsAchievement ?? null) : null,
      sportsCertificateNumber: rc.isSportsQuota ? (rc.sportsCertificateNumber ?? null) : null,
      sportsCertificateAuthority: rc.isSportsQuota ? (rc.sportsCertificateAuthority ?? null) : null,
      sportsCertificateIssueDate: rc.isSportsQuota ? (rc.sportsCertificateIssueDate ?? null) : null,

      isBiharDomicile: rc.isBiharDomicile,
      domicileCertificateNumber: rc.isBiharDomicile
        ? (rc.domicileCertificateNumber ?? null)
        : null,
      domicileCertificateAuthority: rc.isBiharDomicile
        ? (rc.domicileCertificateAuthority ?? null)
        : null,
      domicileCertificateIssueDate: rc.isBiharDomicile
        ? (rc.domicileCertificateIssueDate ?? null)
        : null,

      isLocallyResident: rc.isLocallyResident,
      localDistrictId: rc.isLocallyResident ? (rc.localDistrictId ?? null) : null,

      declaration: rc.declaration,

      // Additional BSSC properties from flat body/rawBody
      biharGovtEmp: (rawBody as any).biharGovtEmployee || (rawBody as any).biharGovtEmp || 'NO',
      bsscAttempts: (rawBody as any).numberOfAttempts || (rawBody as any).bsscAttempts || '0',
      contractualEmp: (rawBody as any).contractualEmployee || (rawBody as any).contractualEmp || 'NO',
      nccCadet: (rawBody as any).nccCadet || 'NO',
      nonCreamyLayer: (rawBody as any).isNonCreamyLayer || (rawBody as any).nonCreamyLayer || 'NO',
      pwd40Percent: (rawBody as any).disabilityPercent || (rawBody as any).pwd40Percent || 'NO',
      contractualPeriod: (rawBody as any).contractualPeriod || '0-0-0',
      postName: (rawBody as any).nameOfPost || (rawBody as any).postName || '',
      hasAgreement: (rawBody as any).agreementCircular || (rawBody as any).hasAgreement || 'NO',
      officeName: (rawBody as any).officeName || '',
      officeOrderNo: (rawBody as any).officeOrderNo || '',
      isFreedomFighter: (rawBody as any).isFreedomFighter || 'NO',
      isDebarred: (rawBody as any).isDebarred || 'NO',
    };

    const draft = await applicationService.getOrCreateDraft(candidate.id);

    // Save Step 0 (Personal Details)
    await applicationService.saveStep(
      draft.applicationId,
      candidate.id,
      0,
      {
        ...rawBody,
        personalInfo: mappedPersonalInfo,
        ...mappedPersonalInfo
      }
    );

    // Save Step 1 (Reservation Details)
    const result = await applicationService.saveStep(
      draft.applicationId,
      candidate.id,
      1,
      {
        ...rawBody,
        reservationCategory: mappedReservation,
        ...mappedReservation
      }
    );

    // Update candidates table
    await userRepository.updateCandidateDetails(candidate.id, {
      dateOfBirth: dobDate,
      mobileNumber: input.personalInfo.mobileNumber,
    });

    return response.success(200, {
      message: 'Candidate personal and reservation details (Step 1) saved successfully',
      data: {
        ...result,
        savedData: {
          personalInfo: mappedPersonalInfo,
          reservationCategory: mappedReservation,
        },
      },
    });
  }

  // ── PATCH /auth/candidate/step-2 ───────────────────────────

  /*
  // ── Original JSSC candidateStep2 (Reservation Category) ──
  async candidateStep2(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { body } = parseEvent(event);

    const input = validate(candidateStep2Schema, body);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const rc = input.reservationCategory || {};

    const draft = await applicationService.getOrCreateDraft(candidate.id);

    // Map frontend payload → internal storage shape
    const mappedData = {
      mainCategory: rc.mainCategory,
      subCategory: rc.subCategory,
      subSubCategoryId: rc.subSubCategoryId ?? null,
      categoryCertificateNumber: rc.categoryCertificateNumber ?? null,
      categoryCertificateAuthority: rc.categoryCertificateAuthority ?? null,
      categoryCertificateIssueDate: rc.categoryCertificateIssueDate ?? null,

      isPwd: rc.isPwd,
      pwdType: rc.isPwd ? (rc.pwdType ?? null) : null,
      pwdPercentage: rc.isPwd ? (rc.pwdPercentage ?? null) : null,
      pwdCertificateNumber: rc.isPwd ? (rc.pwdCertificateNumber ?? null) : null,
      pwdCertificateAuthority: rc.isPwd ? (rc.pwdCertificateAuthority ?? null) : null,
      pwdCertificateIssueDate: rc.isPwd ? (rc.pwdCertificateIssueDate ?? null) : null,

      isExServiceman: rc.isExServiceman,
      exServicemanYears: rc.isExServiceman ? (rc.exServicemanYears ?? null) : null,

      isSportsQuota: rc.isSportsQuota,
      sportsLevel: rc.isSportsQuota ? (rc.sportsLevel ?? null) : null,
      sportsAchievement: rc.isSportsQuota ? (rc.sportsAchievement ?? null) : null,
      sportsCertificateNumber: rc.isSportsQuota ? (rc.sportsCertificateNumber ?? null) : null,
      sportsCertificateAuthority: rc.isSportsQuota ? (rc.sportsCertificateAuthority ?? null) : null,
      sportsCertificateIssueDate: rc.isSportsQuota ? (rc.sportsCertificateIssueDate ?? null) : null,

      isBiharDomicile: rc.isBiharDomicile,
      domicileCertificateNumber: rc.isBiharDomicile
        ? (rc.domicileCertificateNumber ?? null)
        : null,
      domicileCertificateAuthority: rc.isBiharDomicile
        ? (rc.domicileCertificateAuthority ?? null)
        : null,
      domicileCertificateIssueDate: rc.isBiharDomicile
        ? (rc.domicileCertificateIssueDate ?? null)
        : null,

      isLocallyResident: rc.isLocallyResident,
      localDistrictId: rc.isLocallyResident ? (rc.localDistrictId ?? null) : null,

      declaration: rc.declaration,
    };

    const result = await applicationService.saveStep(
      draft.applicationId,
      candidate.id,
      1,
      mappedData
    );

    return response.success(200, {
      message: 'Candidate reservation category (Step 2) saved successfully',
      data: {
        ...result,
        savedData: mappedData,
      },
    });
  }
  */

  async candidateStep2(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const draft = await applicationService.getOrCreateDraft(candidate.id);

    const { paymentService } = await import('../services/payment.service');
    const payments = await paymentService.getPaymentStatus(draft.applicationId, candidate.id);

    const completedPayment = payments.find((p: any) => p.status === 'completed');

    return response.success(200, {
      message: 'Candidate payment status retrieved successfully',
      data: {
        paymentStatus: completedPayment ? 'completed' : payments.length > 0 ? 'initiated' : 'not_initiated',
        payments: payments,
      },
    });
  }

  // ── PATCH /auth/candidate/step-3 ───────────────────────────

  /*
  // ── Original JSSC candidateStep3 (Educational Details) ──
  async candidateStep3(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { body } = parseEvent(event);

    const input = validate(candidateStep3Schema, body);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const qualifications: any[] = [
      {
        level: 'matriculation',
        boardUniversity: input.tenth?.board || 'N/A',
        degree: '10th',
        totalMarks: Number(input.tenth?.totalMarks || 0),
        marksObtained: Number(input.tenth?.marksObtained || 0),
        percentage: Number(input.tenth?.percentage || 0),
        passingYear: input.tenth?.passingYear || null,
        jobQualificationId: resolveJobQualificationId('matriculation', '10th', ''),
      },
    ];

    if (
      input.twelfth &&
      ((input.twelfth.board && input.twelfth.board !== 'N/A') ||
        (input.twelfth.totalMarks && Number(input.twelfth.totalMarks) > 0))
    ) {
      qualifications.push({
        level: 'intermediate',
        boardUniversity: input.twelfth.board || 'N/A',
        degree: '12th',
        totalMarks: Number(input.twelfth.totalMarks || 0),
        marksObtained: Number(input.twelfth.marksObtained || 0),
        percentage: Number(input.twelfth.percentage || 0),
        passingYear: input.twelfth?.passingYear || null,
        jobQualificationId: resolveJobQualificationId('intermediate', '12th', ''),
      });
    }

    if (
      input.graduation &&
      (input.graduation.university ||
        input.graduation.degreeId ||
        (input.graduation.totalMarks && Number(input.graduation.totalMarks) > 0))
    ) {
      qualifications.push({
        level: 'graduation',
        boardUniversity: input.graduation.university || 'N/A',
        degree: input.graduation.degreeId ? String(input.graduation.degreeId) : '0',
        specialization: undefined,
        totalMarks: Number(input.graduation.totalMarks || 0),
        marksObtained: Number(input.graduation.marksObtained || 0),
        percentage: Number(input.graduation.percentage || 0),
        passingYear: input.graduation?.passingYear || null,
        jobQualificationId: resolveJobQualificationId(
          'graduation',
          input.graduation.degreeId ? String(input.graduation.degreeId) : 'Graduation',
          ''
        ),
      });
    }

    if (
      input.postGraduation &&
      (input.postGraduation.hasPostGraduation ||
        input.postGraduation.university ||
        input.postGraduation.degreeId ||
        (input.postGraduation.totalMarks && Number(input.postGraduation.totalMarks) > 0))
    ) {
      qualifications.push({
        level: 'post_graduation',
        boardUniversity: input.postGraduation.university || 'N/A',
        degree: input.postGraduation.degreeId ? String(input.postGraduation.degreeId) : '0',
        specialization: undefined,
        totalMarks: Number(input.postGraduation.totalMarks || 0),
        marksObtained: Number(input.postGraduation.marksObtained || 0),
        percentage: Number(input.postGraduation.percentage || 0),
        passingYear: input.postGraduation?.passingYear || null,
        jobQualificationId: resolveJobQualificationId(
          'post_graduation',
          input.postGraduation.degreeId ? String(input.postGraduation.degreeId) : 'Post Graduation',
          ''
        ),
      });
    }

    const mappedData = {
      ...input,
      qualifications,
    };

    const draft = await applicationService.getOrCreateDraft(candidate.id);
    const result = await applicationService.saveStep(
      draft.applicationId,
      candidate.id,
      2,
      mappedData
    );

    const qualIds = qualifications
      .map((q) => q.jobQualificationId)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    const db = getDb();
    let eligiblePosts: any[] = [];
    if (qualIds.length > 0) {
      const jobQuals = await db
        .select()
        .from(jobQualifications)
        .where(inArray(jobQualifications.slNo, qualIds));

      const postCodes = new Set<string>();
      for (const jq of jobQuals) {
        if (jq.eligiblePostCode) {
          postCodes.add(String(jq.eligiblePostCode));
        }
      }

      const hasMatric = qualifications.some((q) => q.level === 'matriculation');
      const hasGradOrPG = qualifications.some(
        (q) => q.level === 'graduation' || q.level === 'post_graduation'
      );

      let hasMathStatsEco = false;
      for (const q of qualifications) {
        const spec = String(q.specialization || q.degree || '').toLowerCase();
        if (spec.includes('math') || spec.includes('stat') || spec.includes('eco')) {
          hasMathStatsEco = true;
        }
      }

      if (hasMatric) {
        postCodes.add('104');
      }

      if (hasGradOrPG) {
        postCodes.add('101');
        postCodes.add('1');
        postCodes.add('2');
        postCodes.add('3');

        if (hasMathStatsEco) {
          postCodes.add('102');
          postCodes.add('4');
          postCodes.add('7');
        }
      }

      if (postCodes.size > 0) {
        eligiblePosts = await db
          .select()
          .from(posts)
          .where(inArray(posts.postCode, Array.from(postCodes)));
      }
    }

    return response.success(200, {
      message: 'Candidate educational details (Step 3) saved successfully',
      data: {
        ...result,
        savedData: mappedData,
      },
    });
  }
  */

  async candidateStep3(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { body } = parseEvent(event);

    const input = validate(candidateStep3Schema, body);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const qualifications: any[] = [
      {
        level: 'matriculation',
        boardUniversity: input.tenth?.board || 'N/A',
        degree: '10th',
        totalMarks: Number(input.tenth?.totalMarks || 0),
        marksObtained: Number(input.tenth?.marksObtained || 0),
        percentage: Number(input.tenth?.percentage || 0),
        passingYear: input.tenth?.passingYear || null,
        jobQualificationId: resolveJobQualificationId('matriculation', '10th', ''),
      },
    ];

    if (
      input.twelfth &&
      ((input.twelfth.board && input.twelfth.board !== 'N/A') ||
        (input.twelfth.totalMarks && Number(input.twelfth.totalMarks) > 0))
    ) {
      qualifications.push({
        level: 'intermediate',
        boardUniversity: input.twelfth.board || 'N/A',
        degree: '12th',
        totalMarks: Number(input.twelfth.totalMarks || 0),
        marksObtained: Number(input.twelfth.marksObtained || 0),
        percentage: Number(input.twelfth.percentage || 0),
        passingYear: input.twelfth?.passingYear || null,
        jobQualificationId: resolveJobQualificationId('intermediate', '12th', ''),
      });
    }

    if (
      input.graduation &&
      (input.graduation.university ||
        input.graduation.degreeId ||
        (input.graduation.totalMarks && Number(input.graduation.totalMarks) > 0))
    ) {
      qualifications.push({
        level: 'graduation',
        boardUniversity: input.graduation.university || 'N/A',
        degree: input.graduation.degreeId ? String(input.graduation.degreeId) : '0',
        specialization: undefined,
        totalMarks: Number(input.graduation.totalMarks || 0),
        marksObtained: Number(input.graduation.marksObtained || 0),
        percentage: Number(input.graduation.percentage || 0),
        passingYear: input.graduation?.passingYear || null,
        jobQualificationId: resolveJobQualificationId(
          'graduation',
          input.graduation.degreeId ? String(input.graduation.degreeId) : 'Graduation',
          ''
        ),
      });
    }

    if (
      input.postGraduation &&
      (input.postGraduation.hasPostGraduation ||
        input.postGraduation.university ||
        input.postGraduation.degreeId ||
        (input.postGraduation.totalMarks && Number(input.postGraduation.totalMarks) > 0))
    ) {
      qualifications.push({
        level: 'post_graduation',
        boardUniversity: input.postGraduation.university || 'N/A',
        degree: input.postGraduation.degreeId ? String(input.postGraduation.degreeId) : '0',
        specialization: undefined,
        totalMarks: Number(input.postGraduation.totalMarks || 0),
        marksObtained: Number(input.postGraduation.marksObtained || 0),
        percentage: Number(input.postGraduation.percentage || 0),
        passingYear: input.postGraduation?.passingYear || null,
        jobQualificationId: resolveJobQualificationId(
          'post_graduation',
          input.postGraduation.degreeId ? String(input.postGraduation.degreeId) : 'Post Graduation',
          ''
        ),
      });
    }

    // Normalize BSSC flat format fields to match what frontend sends
    const bsscTenth = (body as any).tenth
      ? {
          subject: (body as any).tenth.subject || (body as any).tenth.board || '',
          boardUniversity: (body as any).tenth.boardUniversity || (body as any).tenth.board || 'N/A',
          totalMarks: String((body as any).tenth.totalMarks || '0'),
          obtainedMarks: String((body as any).tenth.obtainedMarks || (body as any).tenth.marksObtained || '0'),
          percentage: String((body as any).tenth.percentage || '0'),
          certNumber: (body as any).tenth.certNumber || '',
          certIssueDate: (body as any).tenth.certIssueDate || null,
        }
      : undefined;

    const bsscTwelfth = (body as any).twelfth
      ? {
          subject: (body as any).twelfth.subject || (body as any).twelfth.board || '',
          boardUniversity: (body as any).twelfth.boardUniversity || (body as any).twelfth.board || 'N/A',
          totalMarks: String((body as any).twelfth.totalMarks || '0'),
          obtainedMarks: String((body as any).twelfth.obtainedMarks || (body as any).twelfth.marksObtained || '0'),
          percentage: String((body as any).twelfth.percentage || '0'),
          certNumber: (body as any).twelfth.certNumber || '',
          certIssueDate: (body as any).twelfth.certIssueDate || null,
        }
      : undefined;

    const bsscGraduation = (body as any).graduation
      ? {
          subject: (body as any).graduation.subject || (body as any).graduation.degreeId || '',
          boardUniversity: (body as any).graduation.boardUniversity || (body as any).graduation.university || 'N/A',
          totalMarks: String((body as any).graduation.totalMarks || '0'),
          obtainedMarks: String((body as any).graduation.obtainedMarks || (body as any).graduation.marksObtained || '0'),
          percentage: String((body as any).graduation.percentage || '0'),
          certNumber: (body as any).graduation.certNumber || '',
          certIssueDate: (body as any).graduation.certIssueDate || null,
        }
      : undefined;

    const bsscPostGraduation = (body as any).postGraduation
      ? {
          subject: (body as any).postGraduation.subject || (body as any).postGraduation.degreeId || '',
          boardUniversity: (body as any).postGraduation.boardUniversity || (body as any).postGraduation.university || 'N/A',
          totalMarks: String((body as any).postGraduation.totalMarks || '0'),
          obtainedMarks: String((body as any).postGraduation.obtainedMarks || (body as any).postGraduation.marksObtained || '0'),
          percentage: String((body as any).postGraduation.percentage || '0'),
          certNumber: (body as any).postGraduation.certNumber || '',
          certIssueDate: (body as any).postGraduation.certIssueDate || null,
        }
      : undefined;

    const mappedData = {
      ...input,
      // Save BSSC flat format so frontend can retrieve exact fields it submitted
      ...(bsscTenth ? { tenth: bsscTenth } : {}),
      ...(bsscTwelfth ? { twelfth: bsscTwelfth } : {}),
      ...(bsscGraduation ? { graduation: bsscGraduation } : {}),
      ...(bsscPostGraduation ? { postGraduation: bsscPostGraduation } : {}),
      qualifications,
    };

    const draft = await applicationService.getOrCreateDraft(candidate.id);
    const result = await applicationService.saveStep(
      draft.applicationId,
      candidate.id,
      3, // Educational details is Step 3 in the DB
      mappedData
    );

    const qualIds = qualifications
      .map((q) => q.jobQualificationId)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    const db = getDb();
    let eligiblePosts: any[] = [];
    if (qualIds.length > 0) {
      const jobQuals = await db
        .select()
        .from(jobQualifications)
        .where(inArray(jobQualifications.slNo, qualIds));

      const postCodes = new Set<string>();
      for (const jq of jobQuals) {
        if (jq.eligiblePostCode) {
          postCodes.add(String(jq.eligiblePostCode));
        }
      }

      const hasMatric = qualifications.some((q) => q.level === 'matriculation');
      const hasGradOrPG = qualifications.some(
        (q) => q.level === 'graduation' || q.level === 'post_graduation'
      );

      let hasMathStatsEco = false;
      for (const q of qualifications) {
        const spec = String(q.specialization || q.degree || '').toLowerCase();
        if (spec.includes('math') || spec.includes('stat') || spec.includes('eco')) {
          hasMathStatsEco = true;
        }
      }

      if (hasMatric) {
        postCodes.add('104');
      }

      if (hasGradOrPG) {
        postCodes.add('101');
        postCodes.add('1');
        postCodes.add('2');
        postCodes.add('3');

        if (hasMathStatsEco) {
          postCodes.add('102');
          postCodes.add('4');
          postCodes.add('7');
        }
      }

      if (postCodes.size > 0) {
        eligiblePosts = await db
          .select()
          .from(posts)
          .where(inArray(posts.postCode, Array.from(postCodes)));
      }
    }

    return response.success(200, {
      message: 'Candidate educational details (Step 3) saved successfully',
      data: {
        ...result,
        savedData: mappedData,
      },
    });
  }

  // ── PATCH /auth/candidate/step-4 ───────────────────────────

  async candidateStep4(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    let parsed: ReturnType<typeof parseMultipart>;
    try {
      parsed = parseMultipart(event);
    } catch (err: any) {
      if (err.message && err.message.includes('Unsupported Media Type')) {
        throw new UnsupportedMediaTypeError(err.message);
      }
      throw new ValidationError([], err.message || 'Invalid multipart/form-data request body');
    }

    const { files } = parsed;

    const existingDocs = await documentService.getCandidateDocuments(candidate.id);
    const existingDocsMap = new Map(existingDocs.map((d) => [d.documentType, d.documentId]));

    const DOCUMENT_FIELDS = ['photograph', 'signatureEnglish', 'signatureHindi'];
    const errors: Array<{ field: string; message: string }> = [];

    // Photograph, English Signature, Hindi Signature are required (either uploaded now or exist already)
    for (const req of DOCUMENT_FIELDS) {
      const docTypeMapped =
        req === 'photograph'
          ? 'photograph'
          : req === 'signatureEnglish'
            ? 'signature_english'
            : 'signature_hindi';
      if (!files[req] && !existingDocsMap.has(docTypeMapped)) {
        errors.push({ field: req, message: `${req} is required` });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Pre-validate file sizes and mime types
    for (const [fieldName, file] of Object.entries(files)) {
      if (!DOCUMENT_FIELDS.includes(fieldName)) continue;

      const fileObj = file as any;
      const allowedTypes = ['image/jpeg', 'image/jpg'];

      if (!allowedTypes.includes(fileObj.mimetype)) {
        errors.push({
          field: fieldName,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        });
      }

      // Max size: Photo (50 KB), Signature (30 KB)
      const maxSize = fieldName === 'photograph' ? 50 * 1024 : 30 * 1024;
      if (fileObj.data.length > maxSize) {
        errors.push({
          field: fieldName,
          message: `File size exceeds limit. Maximum allowed: ${fieldName === 'photograph' ? '50 KB' : '30 KB'}`,
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Upload files and populate documentIds
    const documentIds: Record<string, string | null> = {};

    for (const fieldName of DOCUMENT_FIELDS) {
      const file = files[fieldName];
      const docTypeMapped =
        fieldName === 'photograph'
          ? 'photograph'
          : fieldName === 'signatureEnglish'
            ? 'signature_english'
            : 'signature_hindi';
      if (file) {
        const uploadResult = await documentService.uploadDocument({
          candidateId: candidate.id,
          documentType: docTypeMapped,
          fileName: file.filename,
          mimeType: file.mimetype,
          fileContent: file.data,
          fileSize: file.data.length,
        });
        documentIds[fieldName] = uploadResult.documentId;
      } else {
        documentIds[fieldName] = existingDocsMap.get(docTypeMapped) ?? null;
      }
    }

    const draft = await applicationService.getOrCreateDraft(candidate.id);
    const result = await applicationService.saveStep(
      draft.applicationId,
      candidate.id,
      4, // Step 4 in application.service is BSSC Photo & Signature
      documentIds
    );

    // Resolve document UUIDs to presigned URLs for response
    const savedDataWithUrls: Record<string, string | null> = {};
    for (const [field, docId] of Object.entries(documentIds)) {
      if (docId) {
        const docRecord = await documentRepository.findById(docId);
        if (docRecord) {
          const signedUrl = await documentService.getPresignedUrl(docRecord.fileUrl);
          savedDataWithUrls[field] = signedUrl ?? docId;
        } else {
          savedDataWithUrls[field] = docId;
        }
      } else {
        savedDataWithUrls[field] = null;
      }
    }

    return response.success(200, {
      message: 'Candidate photos and signatures saved successfully',
      data: {
        ...result,
        savedData: savedDataWithUrls,
      },
    });
  }

  // ── POST /auth/candidate/step-5 ───────────────────────────

  async candidateStep5(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    let parsed: ReturnType<typeof parseMultipart>;
    try {
      parsed = parseMultipart(event);
    } catch (err: any) {
      if (err.message && err.message.includes('Unsupported Media Type')) {
        throw new UnsupportedMediaTypeError(err.message);
      }
      throw new ValidationError([], err.message || 'Invalid multipart/form-data request body');
    }

    const { files } = parsed;
    const livePhotoFile = files['livePhoto'];

    if (!livePhotoFile) {
      throw new ValidationError([{ field: 'livePhoto', message: 'Live photo file is required' }]);
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(livePhotoFile.mimetype)) {
      throw new ValidationError([{
        field: 'livePhoto',
        message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      }]);
    }

    // Validate file size (max 5 MB for live photo)
    const maxSize = 5 * 1024 * 1024;
    if (livePhotoFile.data.length > maxSize) {
      throw new ValidationError([{
        field: 'livePhoto',
        message: 'File size exceeds limit. Maximum allowed: 5 MB',
      }]);
    }

    // Upload the live photo
    const uploadResult = await documentService.uploadDocument({
      candidateId: candidate.id,
      documentType: 'live_photo',
      fileName: livePhotoFile.filename,
      mimeType: livePhotoFile.mimetype,
      fileContent: livePhotoFile.data,
      fileSize: livePhotoFile.data.length,
    });
    const livePhotoUuid = uploadResult.documentId;

    const draft = await applicationService.getOrCreateDraft(candidate.id);
    const result = await applicationService.saveStep(
      draft.applicationId,
      candidate.id,
      5, // Step 5 in application.service is BSSC Live Photo
      { livePhoto: livePhotoUuid }
    );

    // Resolve livePhoto UUID to presigned URL for response
    let livePhotoUrl: string | null = livePhotoUuid;
    if (livePhotoUuid) {
      const docRecord = await documentRepository.findById(livePhotoUuid);
      if (docRecord) {
        const signedUrl = await documentService.getPresignedUrl(docRecord.fileUrl);
        livePhotoUrl = signedUrl ?? livePhotoUuid;
      }
    }

    return response.success(200, {
      message: 'Candidate live photo saved successfully',
      data: {
        ...result,
        savedData: { livePhoto: livePhotoUrl },
      },
    });
  }

  /*
  // ── Original JSSC candidateStep4 (Languages Selection) ──
  async candidateStep4(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { body } = parseEvent(event);

    const input = validate(candidateStep4Schema, body);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const draft = await applicationService.getOrCreateDraft(candidate.id);
    const result = await applicationService.saveStep(
      draft.applicationId,
      candidate.id,
      4, // Step 4 in application.service is languageSelection / subjects
      input.subjects
    );

    return response.success(200, {
      message: 'Candidate subjects/languages (Step 4) saved successfully',
      data: {
        ...result,
        savedData: input.subjects,
      },
    });
  }

  // ── Original JSSC candidateStep5 (Documents Upload) ──
  async candidateStep5(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    let parsed: ReturnType<typeof parseMultipart>;
    try {
      parsed = parseMultipart(event);
    } catch (err: any) {
      if (err.message && err.message.includes('Unsupported Media Type')) {
        throw new UnsupportedMediaTypeError(err.message);
      }
      throw new ValidationError([], err.message || 'Invalid multipart/form-data request body');
    }

    const { files } = parsed;

    const existingDocs = await documentService.getCandidateDocuments(candidate.id);
    const existingDocsMap = new Map(existingDocs.map((d) => [d.documentType, d.documentId]));

    const DOCUMENT_FIELDS = [
      'tenthMarksheet',
      'twelfthMarksheet',
      'graduationMarksheet',
      'postGraduationCertificate',
      'diplomaCertificate',
      'experienceCertificate',
      'contractualServiceCertificate',
      'ewsCertificate',
      'aadharCard',
      'signature',
      'photo',
      'domicileCertificate',
      'castCertificate',
      'sportsCertificate',
      'pwdCertificate',
    ];

    const draft = await applicationService.getOrCreateDraft(candidate.id);
    const db = getDb();

    // 1. Fetch Reservation & Domicile details (Step 2 / stepNumber = 1)
    let isPwd = false;
    let isSportsQuota = false;
    let isBiharDomicile = false;
    let isReserved = false;
    let isEWS = false;

    const step1Row = await db
      .select({ data: applicationStepData.data })
      .from(applicationStepData)
      .where(
        and(
          eq(applicationStepData.applicationId, draft.applicationId),
          eq(applicationStepData.stepNumber, 1)
        )
      )
      .limit(1);

    if (step1Row[0]?.data) {
      const rc = step1Row[0].data as any;
      isPwd = rc.isPwd === true;
      isSportsQuota = rc.isSportsQuota === true;
      isBiharDomicile = rc.isBiharDomicile === true;

      const catId = rc.mainCategory;
      const cat = await db.select().from(categories).where(eq(categories.catId, catId)).limit(1);
      const categoryName = cat[0]?.catName || 'Unreserved (UR)';
      if (
        categoryName.toLowerCase().includes('bc') ||
        categoryName.toLowerCase().includes('caste') ||
        categoryName.toLowerCase().includes('tribe')
      ) {
        isReserved = true;
      }
      if (categoryName.toLowerCase().includes('ews')) {
        isEWS = true;
      }
    }

    // 2. Fetch Educational details (Step 3 / stepNumber = 2)
    let hasGrad = false;
    let hasPG = false;
    let hasDiploma = false;
    let hasExperience = false;
    let hasContractual = false;

    const step2Row = await db
      .select({ data: applicationStepData.data })
      .from(applicationStepData)
      .where(
        and(
          eq(applicationStepData.applicationId, draft.applicationId),
          eq(applicationStepData.stepNumber, 2)
        )
      )
      .limit(1);

    if (step2Row[0]?.data) {
      const edu = step2Row[0].data as any;
      const hq = edu.highestQualification;
      if (
        hq === 'graduation' ||
        hq === 'post_graduation' ||
        (edu.graduation && edu.graduation.graduationCourse)
      ) {
        hasGrad = true;
      }
      if (hq === 'post_graduation' || edu.postGraduation?.hasPostGraduation) {
        hasPG = true;
      }
      if (edu.diploma?.hasDiploma) {
        hasDiploma = true;
      }
      if (edu.experience?.hasExperience) {
        hasExperience = true;
      }
      if (edu.contractualService?.hasContractualService) {
        hasContractual = true;
      }
    }

    const errors: Array<{ field: string; message: string }> = [];

    // Required fields: signature, photo, tenthMarksheet
    const requiredFields = ['signature', 'photo', 'tenthMarksheet'];

    for (const req of requiredFields) {
      if (!files[req] && !existingDocsMap.has(req)) {
        errors.push({ field: req, message: `${req} is required` });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Pre-validate file sizes and mime types
    for (const [fieldName, file] of Object.entries(files)) {
      if (!DOCUMENT_FIELDS.includes(fieldName)) continue;

      const isPhotoOrSignature = fieldName === 'photo' || fieldName === 'signature';
      const allowedTypes = isPhotoOrSignature
        ? ['image/jpeg', 'image/jpg', 'image/png']
        : ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

      const fileObj = file as any;
      if (!allowedTypes.includes(fileObj.mimetype)) {
        errors.push({
          field: fieldName,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        });
      }

      const maxSize = 3 * 1024 * 1024; // 3 MB for all document types

      if (fileObj.data.length > maxSize) {
        errors.push({
          field: fieldName,
          message: `File size exceeds limit. Maximum allowed: 3 MB`,
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Upload files and populate documentIds
    const documentIds: Record<string, string | null> = {};

    for (const fieldName of DOCUMENT_FIELDS) {
      const file = files[fieldName];
      if (file) {
        const uploadResult = await documentService.uploadDocumentStep5({
          candidateId: candidate.id,
          userId: user.userId,
          documentType: fieldName,
          fileName: file.filename,
          mimeType: file.mimetype,
          fileContent: file.data,
          fileSize: file.data.length,
        });
        documentIds[fieldName] = uploadResult.documentId;
      } else {
        documentIds[fieldName] = existingDocsMap.get(fieldName) ?? null;
      }
    }

    const stepDataPayload = {
      ...documentIds,
      declarationAccepted: true,
    };

    const result = await applicationService.saveStep(
      draft.applicationId,
      candidate.id,
      6, // Step 6 is documents step
      stepDataPayload
    );

    return response.success(200, {
      message: 'Candidate documents (Step 5) saved successfully',
      data: {
        ...result,
        savedData: stepDataPayload,
      },
    });
  }
  */

  // ── PATCH /auth/candidate/step-6 ───────────────────────────

  async candidateStep6(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { body } = parseEvent(event);
    const input = validate(candidateStep6Schema, body);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const draft = await applicationService.getOrCreateDraft(candidate.id);

    const result = await applicationService.saveStep(
      draft.applicationId,
      candidate.id,
      3, // Step 3 in application.service is postPreference
      input.postPreferences
    );

    return response.success(200, {
      message: 'Candidate post preferences (Step 6) saved successfully',
      data: {
        ...result,
        savedData: input.postPreferences,
      },
    });
  }

  // ── GET /auth/candidate/step/{stepNumber} ───────────────────

  async getCandidateStep(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const stepNumberStr = pathParameters.stepNumber;
    if (!stepNumberStr)
      throw new AppError('Please select a valid application step to continue.', 400);

    const step = parseInt(stepNumberStr, 10);
    if (isNaN(step) || step < 0 || step > 8)
      throw new AppError(
        'We could not load this section. Please use the navigation buttons to move between application steps.',
        400
      );

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const draft = await applicationService.getOrCreateDraft(candidate.id);
    const data = await applicationService.getStepData(draft.applicationId, candidate.id, step);

    return response.success(200, { data: data ?? {} });
  }

  // ── POST /auth/refresh-token ──────────────────────────────────

  async refreshToken(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(refreshTokenSchema, body);
    const tokens = await authService.refreshToken(input);
    return response.success(200, { message: 'Token refreshed', tokens });
  }

  // ── POST /auth/forgot-password ────────────────────────────────

  async forgotPassword(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(forgotPasswordSchema, body);
    await authService.forgotPassword(input);
    return response.success(200, {
      message: 'If this email is registered, a password reset link will be sent.',
    });
  }

  // ── POST /auth/reset-password ─────────────────────────────────

  async resetPassword(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(resetPasswordSchema, body);
    await authService.resetPassword(input);
    return response.success(200, { message: 'Password has been reset successfully.' });
  }

  // ── POST /auth/change-password ────────────────────────────────

  async changePassword(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { body } = parseEvent(event);
    const input = validate(changePasswordSchema, body);
    await authService.changePassword(user.userId, input);
    return response.success(200, { message: 'Password changed successfully.' });
  }

  // ── POST /auth/logout ─────────────────────────────────────────

  async logout(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const token = getAuthorizationToken(event) ?? '';
    await authService.logout(token);
    return response.success(200, { message: 'Logged out successfully.' });
  }

  // ── GET /auth/profile ─────────────────────────────────────────

  async getProfile(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const userRecord = await userRepository.findById(user.userId);
    if (!userRecord) {
      return response.error(404, { message: 'User profile not found' });
    }
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    const { passwordHash: _ph, ...safeUser } = userRecord;
    return response.success(200, {
      user: safeUser,
      candidate: candidate
        ? {
          candidateId: candidate.id,
          registrationNumber: candidate.registrationNumber,
          mobileVerified: candidate.mobileVerified,
          emailVerified: candidate.emailVerified,
        }
        : null,
    });
  }

  // ── GET /auth/candidate/registration ───────────────────────────

  async getCandidateRegistration(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const userRecord = await userRepository.findById(user.userId);
    if (!userRecord) {
      return response.error(404, { message: 'User profile not found' });
    }
    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) {
      return response.error(404, { message: 'Candidate profile not found' });
    }
    return response.success(200, {
      data: {
        fullName: userRecord.fullName,
        email: userRecord.email,
        mobileNumber: candidate.mobileNumber,
        dateOfBirth: candidate.dateOfBirth
          ? candidate.dateOfBirth.toISOString().split('T')[0]
          : null,
        registrationNumber: candidate.registrationNumber,
        emailVerified: candidate.emailVerified,
        mobileVerified: candidate.mobileVerified,
      },
    });
  }

  // ── GET /auth/candidates ───────────────────────────────────────

  async getAllCandidates(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const candidatesList = await userRepository.findAllCandidates();
    const { documentService } = await import('../services/document.service');

    const updatedCandidates = await Promise.all(
      candidatesList.map(async (candidate) => {
        const documents = await Promise.all(
          (candidate.documents || []).map(async (doc: any) => {
            const presignedUrl = await documentService.getPresignedUrl(doc.fileUrl);
            return {
              ...doc,
              // presignedUrl is null for corrupted s3:// placeholder URLs (legacy bug)
              fileUrl: presignedUrl ?? doc.fileUrl,
              signedUrl: presignedUrl,
            };
          })
        );
        return {
          ...candidate,
          documents,
        };
      })
    );

    return response.success(200, {
      message: 'All candidate profiles retrieved successfully',
      data: updatedCandidates,
    });
  }

  // ── POST /auth/seed-dummy ─────────────────────────────────────

  async seedDummy(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const result = await authService.seedDummy();
    return response.success(200, {
      message: 'Dummy data seeded successfully',
      ...result,
    });
  }

  // ── OTP Endpoints ─────────────────────────────────────────────

  async sendMobileOtp(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(sendMobileOtpSchema, body);
    const result = await otpService.sendMobileOtp(input);
    return response.success(200, { message: 'OTP sent to mobile', ...result });
  }

  async verifyMobileOtp(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(verifyMobileOtpSchema, body);
    const result = await otpService.verifyMobileOtp(input);

    if (result.verified) {
      const user = await authenticate(event);
      const candidate = await userRepository.findCandidateByUserId(user.userId);
      if (candidate) {
        await userRepository.updateCandidateVerification(candidate.id, {
          mobileVerified: true,
        });
      }
    }

    return response.success(200, { message: 'Mobile OTP verified', ...result });
  }

  async sendEmailOtp(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(sendEmailOtpSchema, body);
    const result = await otpService.sendEmailOtp(input);
    return response.success(200, { message: 'OTP sent to email', ...result });
  }

  async verifyEmailOtp(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(verifyEmailOtpSchema, body);
    const result = await otpService.verifyEmailOtp(input);

    if (result.verified) {
      const user = await authenticate(event);
      const candidate = await userRepository.findCandidateByUserId(user.userId);
      if (candidate) {
        await userRepository.updateCandidateVerification(candidate.id, {
          emailVerified: true,
        });
      }
    }

    return response.success(200, { message: 'Email OTP verified', ...result });
  }

  async resendOtp(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);
    const input = validate(resendOtpSchema, body);
    const result = await otpService.resendOtp(input);
    return response.success(200, { message: 'OTP resent', ...result });
  }
}

export const authController = new AuthController();
export default authController;
