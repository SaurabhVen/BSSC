import { z } from 'zod';
import { calculateBSSCAge } from '../utils/age';

// ── Common reusable primitives ────────────────────────────────

const passwordSchema = z.string().min(1, 'Password is required');

const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase();

const mobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number (10 digits starting 6-9)');

const otpCodeSchema = z
  .string()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d+$/, 'OTP must contain digits only');

// ── Auth Schemas ──────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  captchaId: z.string().min(1, 'Captcha ID is required'),
  captchaText: z.string().min(1, 'Captcha text is required'),
});

export const validateCaptchaSchema = z.object({
  captchaId: z.string().min(1, 'Captcha ID is required'),
  captchaText: z.string().min(1, 'Captcha text is required'),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    oldRegistrationNumber: z.string().optional().nullable(),
    fullName: z.string().min(1).max(200),
    dateOfBirth: z
      .string()
      .regex(
        /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
        'Date of birth must be in dd-mm-yyyy format'
      )
      .optional(),
    mobileNumber: mobileSchema.optional(),
    cognitoSubId: z.string().uuid('Invalid Cognito Sub ID').optional(),
    captchaId: z.string().min(1, 'Captcha ID is required').optional(),
    captchaText: z.string().min(1, 'Captcha text is required').optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.cognitoSubId) {
      if (!data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter your password confirmation.',
          path: ['confirmPassword'],
        });
      }
      if (!data.dateOfBirth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter your date of birth.',
          path: ['dateOfBirth'],
        });
      }
      if (!data.mobileNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid 10-digit mobile number.',
          path: ['mobileNumber'],
        });
      }
    }
  });

export const candidateRegisterSchema = z
  .preprocess(
    (data: any) => {
      if (data && typeof data === 'object') {
        if (data.captchaCode !== undefined && data.captchaText === undefined) {
          return {
            ...data,
            captchaText: data.captchaCode,
          };
        }
      }
      return data;
    },
    z.object({
      fullName: z.string().min(1, 'Full name is required').max(200),
      dateOfBirth: z
        .string()
        .regex(
          /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
          'Date of birth must be in dd-mm-yyyy format'
        ),
      mobileNumber: mobileSchema,
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string().min(1, 'Confirm password is required'),
      // cognitoSubId: z.string().uuid('Invalid Cognito Sub ID').optional(),

      // Optional Cognito Custom and standard attributes
      bihar_domicile: z.string().optional(),
      bihar_govt_emp: z.string().optional(),
      bssc_attempts: z.string().optional(),
      caste: z.string().optional(),
      category: z.string().optional(),
      contractual_emp: z.string().optional(),
      disability_type: z.string().optional(),
      ex_serviceman: z.string().optional(),
      is_pwd: z.string().optional(),
      mobile_no: z.string().optional(),
      non_creamy_layer: z.string().optional(),
      pwd_40_percent: z.string().optional(),
      contractual_period: z.string().optional(),
      post_name: z.string().optional(),
      has_agreement: z.string().optional(),
      gender: z.string().optional(),
      service_period: z.string().optional(),
      dis_type_persist: z.string().optional(),
      is_scribe_required: z.string().optional(),
      organization_name: z.string().optional(),
      has_post_experience: z.string().optional(),
    })
  );

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  captchaId: z.string().min(1, 'Captcha ID is required'),
  captchaText: z.string().min(1, 'Captcha text is required'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  email: emailSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, 'Confirm new password is required'),
  });

// ── OTP Schemas ───────────────────────────────────────────────

export const sendMobileOtpSchema = z.object({
  mobileNumber: mobileSchema,
  purpose: z.enum(['registration', 'verification', 'login', 'reset']),
});

export const verifyMobileOtpSchema = z.object({
  otpRequestId: z.string().min(1, 'OTP Request ID is required'),
  otp: otpCodeSchema,
});

export const sendEmailOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(['registration', 'verification', 'login', 'reset']),
});

export const verifyEmailOtpSchema = z.object({
  otpRequestId: z.string().min(1, 'OTP Request ID is required'),
  otp: otpCodeSchema,
});

export const resendOtpSchema = z.object({
  otpRequestId: z.string().min(1, 'OTP Request ID is required'),
});


export const forgotRegistrationNumberSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .toLowerCase()
    .trim(),
});

export type ForgotRegistrationNumberInput = z.infer<typeof forgotRegistrationNumberSchema>;

// ── Candidate Step 1 Schema ────────────────────────────────────

export const candidateAddressSchema = z.object({
  street: z.string().min(1, 'Street/House details are required').max(255),
  post: z.string().min(1, 'Post office is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  district: z.string().min(1, 'District is required').max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  cityOrVillage: z.string().min(1, 'City/Village is required').max(100),
});
/*
// ── Original JSSC Candidate Step 1 Schema ───────────────────────────
export const candidateStep1Schema_legacy = z.object({
  personalInfo: z.object({ ... })
});
*/

/*
export const candidateStep1Schema = z.object({
  personalInfo: z
    .object({
      fullName: z.string().min(1, 'Full name is required').max(200),
      fathersName: z.string().min(1, "Father's name is required").max(200),
      motherName: z.string().min(1, "Mother's name is required").max(200),
      dob: z
        .string()
        .regex(
          /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
          'Date of birth must be in dd-mm-yyyy format'
        ),
      age: z.number().int().min(18).max(100).optional(),
      gender: z.string().optional(),
      nationality: z.string().min(1, 'Nationality is required').max(100),
      aadharNumber: z.string().regex(/^\d{12}$/, 'Aadhaar number must be exactly 12 digits').optional().nullable().or(z.literal('')),
      identificationMark1: z.string().min(0).max(255),
      identificationMark2: z.string().max(255).optional(),
      mobileNumber: mobileSchema,
      alternateNumber: mobileSchema.optional().or(z.literal('')),
      maritalStatus: z.string().optional().or(z.literal('')),
      emailId: emailSchema,
      permanentAddress: candidateAddressSchema,
      sameAsPermanent: z.boolean().default(false),
      correspondenceAddress: candidateAddressSchema.optional(),
      spouseName: z.string().max(200).optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.sameAsPermanent && !data.correspondenceAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correspondenceAddress'],
          message: 'Correspondence address is required when sameAsPermanent is false',
        });
      }
    }),
  reservationCategory: z
    .object({
      isLocallyResident: z.union([z.boolean(), z.string()]),
      localDistrictId: z.number().int().optional(),
      isBiharDomicile: z.boolean(),
      domicileCertificateNumber: z.string().optional(),
      domicileCertificateAuthority: z.string().optional(),
      domicileCertificateIssueDate: z.string().optional().or(z.literal('')),
      mainCategory: z.number().int(),
      subCategory: z.number().int().optional().nullable(),
      subSubCategoryId: z.number().int().optional().nullable(),
      categoryCertificateNumber: z.string().optional(),
      categoryCertificateAuthority: z.string().optional(),
      categoryCertificateIssueDate: z.string().optional().or(z.literal('')),
      isPwd: z.boolean(),
      pwdType: z.number().int().optional(),
      pwdPercentage: z.number().min(0).max(100).optional(),
      pwdCertificateNumber: z.string().optional(),
      pwdCertificateAuthority: z.string().optional(),
      pwdCertificateIssueDate: z.string().optional().or(z.literal('')),
      isExServiceman: z.boolean(),
      exServicemanYears: z.number().int().min(0).optional(),
      isSportsQuota: z.boolean(),
      sportsLevel: z.string().optional(),
      sportsAchievement: z.string().optional(),
      sportsCertificateNumber: z.string().optional(),
      sportsCertificateAuthority: z.string().optional(),
      sportsCertificateIssueDate: z.string().optional().or(z.literal('')),
      declaration: z.literal(true, {
        errorMap: () => ({
          message: 'You must agree to the declaration to proceed.',
        }),
      }),
    })
    .superRefine((data, ctx) => {
      if (data.isBiharDomicile) {
        if (!data.domicileCertificateNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['domicileCertificateNumber'],
            message: 'Please enter your domicile certificate number.',
          });
        }
      }
      if (data.isPwd) {
        if (!data.pwdType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pwdType'],
            message: 'Please select the type of disability.',
          });
        }
        if (!data.pwdPercentage || data.pwdPercentage < 40) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pwdPercentage'],
            message:
              'Your disability percentage must be at least 40% to be eligible under the PwD category.',
          });
        }
      }
      if (data.isExServiceman && !data.exServicemanYears) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['exServicemanYears'],
          message: 'Please enter your total years of service.',
        });
      }
      if (data.isSportsQuota) {
        if (!data.sportsLevel) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['sportsLevel'],
            message: 'Please select your level of sports participation.',
          });
        }
        if (!data.sportsAchievement) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['sportsAchievement'],
            message: 'Please select your highest sports achievement.',
          });
        }
      }
    }),
});
*/

export const candidateStep1Schema = z.object({
  personalInfo: z
    .object({
      fullName: z.string().default(''),
      fathersName: z.string().default(''),
      motherName: z.string().default(''),
      dob: z.string().default('16-10-1999'),
      age: z.number().default(25),
      gender: z.string().default('MALE'),
      nationality: z.string().default('Indian'),
      aadharNumber: z.string().nullable().default(''),
      identificationMark1: z.string().default(''),
      identificationMark2: z.string().default(''),
      mobileNumber: z.string().default(''),
      alternateNumber: z.string().default(''),
      maritalStatus: z.string().default(''),
      emailId: z.string().default(''),
      permanentAddress: z
        .object({
          street: z.string().default(''),
          post: z.string().default(''),
          state: z.string().default(''),
          district: z.string().default(''),
          pincode: z.string().default(''),
          cityOrVillage: z.string().default(''),
        })
        .default({}),
      sameAsPermanent: z.boolean().default(false),
      correspondenceAddress: z
        .object({
          street: z.string().default(''),
          post: z.string().default(''),
          state: z.string().default(''),
          district: z.string().default(''),
          pincode: z.string().default(''),
          cityOrVillage: z.string().default(''),
        })
        .default({}),
      spouseName: z.string().default(''),
    })
    .default({}),
  reservationCategory: z
    .object({
      isLocallyResident: z.union([z.boolean(), z.string()]).default(false),
      localDistrictId: z.number().nullable().default(null),
      isBiharDomicile: z.boolean().default(false),
      domicileCertificateNumber: z.string().nullable().default(''),
      domicileCertificateAuthority: z.string().nullable().default(''),
      domicileCertificateIssueDate: z.string().nullable().default(''),
      mainCategory: z.number().default(1),
      subCategory: z.number().nullable().default(null),
      subSubCategoryId: z.number().nullable().default(null),
      categoryCertificateNumber: z.string().nullable().default(''),
      categoryCertificateAuthority: z.string().nullable().default(''),
      categoryCertificateIssueDate: z.string().nullable().default(''),
      isPwd: z.boolean().default(false),
      pwdType: z.number().nullable().default(null),
      pwdPercentage: z.number().nullable().default(null),
      pwdCertificateNumber: z.string().nullable().default(''),
      pwdCertificateAuthority: z.string().nullable().default(''),
      pwdCertificateIssueDate: z.string().nullable().default(''),
      isExServiceman: z.boolean().default(false),
      exServicemanYears: z.number().nullable().default(null),
      biharGovtEmp: z.union([z.boolean(), z.string()]).optional().nullable(),
      isSportsQuota: z.boolean().default(false),
      sportsLevel: z.string().nullable().default(''),
      sportsAchievement: z.string().nullable().default(''),
      sportsCertificateNumber: z.string().nullable().default(''),
      sportsCertificateAuthority: z.string().nullable().default(''),
      sportsCertificateIssueDate: z.string().nullable().default(''),
      declaration: z.boolean().default(true),
    })
    .default({}),
});

/*
// ── Original JSSC Candidate Step 2 Schema ───────────────────────────
export const candidateStep2Schema_legacy = z.object({
  reservationCategory: z.object({ ... })
});
*/

export const candidateStep2Schema = z.object({
  paymentMode: z.enum(['online_card', 'online_upi', 'online_netbanking', 'challan']).optional(),
  paymentOrderId: z.string().optional(),
  paymentStatus: z.string().optional(),
});
// ── Candidate Step 3 Schema ────────────────────────────────────

export const candidateStep3Schema = z.object({
  tenth: z
    .object({
      board: z.string().optional(),
      percentage: z.string().optional(),
      totalMarks: z.string().optional(),
      marksObtained: z.string().optional(),
      passingCertificateNo: z.string().optional(),
      passingYear: z.string().optional().nullable().or(z.literal('')),
    })
    .optional()
    .default({}),

  twelfth: z
    .object({
      board: z.string().optional(),
      percentage: z.string().optional(),
      totalMarks: z.string().optional(),
      marksObtained: z.string().optional(),
      passingCertificateNo: z.string().optional(),
      passingYear: z.string().optional().nullable().or(z.literal('')),
    })
    .optional()
    .default({}),

  graduation: z
    .object({
      degreeId: z
        .union([z.number(), z.string()])
        .optional()
        .transform((v) => (v === '' || v == null ? undefined : Number(v))),
      university: z.string().optional(),
      percentage: z.string().optional(),
      totalMarks: z.string().optional(),
      marksObtained: z.string().optional(),
      passingCertificateNo: z.string().optional(),
      passingYear: z.string().optional().nullable().or(z.literal('')),
    })
    .optional()
    .default({}),

  postGraduation: z
    .object({
      hasPostGraduation: z.boolean().optional(),
      degreeId: z
        .union([z.number(), z.string()])
        .optional()
        .transform((v) => (v === '' || v == null ? undefined : Number(v))),
      university: z.string().optional(),
      percentage: z.string().optional(),
      totalMarks: z.string().optional(),
      marksObtained: z.string().optional(),
      passingCertificateNo: z.string().optional(),
      passingYear: z.string().optional().nullable().or(z.literal('')),
    })
    .optional()
    .default({}),
});

// ── Exported Types ────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CandidateRegisterInput = z.infer<typeof candidateRegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SendMobileOtpInput = z.infer<typeof sendMobileOtpSchema>;
export type VerifyMobileOtpInput = z.infer<typeof verifyMobileOtpSchema>;
export type SendEmailOtpInput = z.infer<typeof sendEmailOtpSchema>;
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type CandidateStep1Input = z.infer<typeof candidateStep1Schema>;
export type CandidateStep2Input = z.infer<typeof candidateStep2Schema>;
export type CandidateStep3Input = z.infer<typeof candidateStep3Schema>;

export const candidateStep4Schema = z.object({
  photograph: z.string().uuid('Photograph is required'),
  signatureEnglish: z.string().uuid('English Signature is required'),
  signatureHindi: z.string().uuid('Hindi Signature is required'),
});

export type CandidateStep4Input = z.infer<typeof candidateStep4Schema>;

export const candidateStep5Schema = z.object({
  livePhoto: z.string().uuid('Live Photo is required'),
});

export type CandidateStep5Input = z.infer<typeof candidateStep5Schema>;

export const candidateStep6Schema = z.object({
  postPreferences: z.object({
    vacancyStream: z.enum(['both', 'regular', 'backlog']).optional(),
    isRegular: z.boolean().optional(),
    isBacklog: z.boolean().optional(),
    postRankings: z
      .array(
        z.object({
          postCode: z.union([z.string(), z.number()]),
          priority: z.number().int(),
        })
      )
      .min(1, 'At least one post ranking is required'),
  }),
});

export type CandidateStep6Input = z.infer<typeof candidateStep6Schema>;
