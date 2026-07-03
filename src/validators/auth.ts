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
    fullName: z.string().min(1).max(200),
    dateOfBirth: z
      .string()
      .regex(
        /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
        'Date of birth must be in dd-mm-yyyy format'
      ),
    mobileNumber: mobileSchema,
    captchaId: z.string().min(1, 'Captcha ID is required').optional(),
    captchaText: z.string().min(1, 'Captcha text is required').optional(),
  });

// export const candidateRegisterSchema = z
//   .preprocess(
//     (data: any) => {
//       if (data && typeof data === 'object') {
//         if (data.captchaCode !== undefined && data.captchaText === undefined) {
//           return {
//             ...data,
//             captchaText: data.captchaCode,
//           };
//         }
//       }
//       return data;
//     },
//     z.object({
//       fullName: z.string().min(1, 'Full name is required').max(200),
//       dateOfBirth: z
//         .string()
//         .regex(
//           /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
//           'Date of birth must be in dd-mm-yyyy format'
//         ),
//       mobileNumber: mobileSchema,
//       email: emailSchema,

//     })
//   );
export const candidateRegisterSchema = z.object({
  fullName: z.string().min(1, 'Applicant name is required').max(150),
  gender: z.string().min(1, 'Gender is required').max(20),
  domicileBihar: z.boolean().default(false),
  category: z.string().min(1, 'Category is required').max(20),
  caste: z.string().min(1, 'Caste is required').max(100),
  isPwd: z.boolean().default(false),
  pwd40Percent: z.boolean().default(false),
  nonCreamyLayer: z.boolean().default(false),
  exServiceman: z.boolean().default(false),
  defenceServiceYears: z.number().int().nonnegative().default(0),
  nccFullTime: z.boolean().default(false),
  nccCertificateNo: z.string().max(100).optional().default(''),
  govtEmployee: z.boolean().default(false),
  bsscAttempts: z.number().int().nonnegative().default(0),
  contractualEmployee: z.boolean().default(false),
  contractualPost: z.string().max(100).optional().default(''),
  agreementAvailable: z.boolean().default(false),
  contractYears: z.number().int().nonnegative().default(0),
  contractMonths: z.number().int().nonnegative().default(0),
  contractDays: z.number().int().nonnegative().default(0),
  mobile: mobileSchema,
  email: emailSchema,
  dateOfBirth: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Date of birth must be in yyyy-mm-dd format'
    ),
});



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

// ── Candidate Step 1 Schema ────────────────────────────────────

// export const candidateAddressSchema = z.object({
//   street: z.string().min(1, 'Street/House details are required').max(255),
//   post: z.string().min(1, 'Post office is required').max(100),
//   state: z.string().min(1, 'State is required').max(100),
//   district: z.string().min(1, 'District is required').max(100),
//   pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
//   cityOrVillage: z.string().min(1, 'City/Village is required').max(100),
// });
// export const candidateStep1Schema = z.object({
//   personalInfo: z
//     .object({
//       fullName: z.string().min(1, 'Full name is required').max(200),

//       fathersName: z.string().min(1, "Father's name is required").max(200),

//       motherName: z.string().min(1, "Mother's name is required").max(200),

//       dob: z
//         .string()
//         .regex(
//           /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
//           'Date of birth must be in dd-mm-yyyy format'
//         ),

//       age: z.number().int().min(18).max(100).optional(),

//       gender: z.string().optional(),

//       nationality: z.string().min(1, 'Nationality is required').max(100),

//       aadharNumber: z.string().regex(/^\d{12}$/, 'Aadhaar number must be exactly 12 digits').optional().nullable().or(z.literal('')),

//       identificationMark1: z.string().min(0).max(255),

//       identificationMark2: z.string().max(255).optional(),

//       mobileNumber: mobileSchema,

//       alternateNumber: mobileSchema.optional().or(z.literal('')),

//       maritalStatus: z.string().optional().or(z.literal('')),

//       emailId: emailSchema,

//       permanentAddress: candidateAddressSchema,

//       sameAsPermanent: z.boolean().default(false),

//       correspondenceAddress: candidateAddressSchema.optional(),
//       spouseName: z.string().max(200).optional(),

//     })
//     .superRefine((data, ctx) => {
//       if (!data.sameAsPermanent && !data.correspondenceAddress) {
//         ctx.addIssue({
//           code: z.ZodIssueCode.custom,
//           path: ['correspondenceAddress'],
//           message: 'Correspondence address is required when sameAsPermanent is false',
//         });
//       }
//     }),
//});

 export const candidateAddressSchema = z.object({
  street: z.string().min(1, 'Street/House details are required').max(255),
  policeStation: z.string().min(1, 'Police station is required').max(100), // <-- Add this line
  post: z.string().min(1, 'Post office is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  district: z.string().min(1, 'District is required').max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  cityOrVillage: z.string().min(1, 'City/Village is required').max(100),
 });

export const candidateStep1Schema = z.object({
  personalInfo: z
    .object({
      fathersName: z.string().min(1, "Father's name is required").max(200),
      motherName: z.string().min(1, "Mother's name is required").max(200),
      nationality: z.string().min(1, 'Nationality is required').max(100),
      aadharNumber: z.string().regex(/^\d{12}$/, 'Aadhaar number must be exactly 12 digits').optional().nullable().or(z.literal('')),
      identificationMark1: z.string().min(1, 'Identification mark is required').max(255),
      identificationMark2: z.string().max(255).optional(),
      maritalStatus: z.string().optional().or(z.literal('')),
      spouseName: z.string().max(200).optional(),
      sameAsPermanent: z.boolean().default(false),
      permanentAddress: candidateAddressSchema,
      correspondenceAddress: candidateAddressSchema.optional(),
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
    
  reservationAndCertificates: z.object({
    isBiharDomicile: z.boolean().default(true),
    domicileCertificateNumber: z.string().min(1, 'Domicile certificate number is required'),
    domicileCertificateAuthority: z.string().min(1, 'Domicile certificate authority is required'),
    domicileCertificateIssueDate: z.string().min(1, 'Domicile certificate issue date is required'),
    categoryCertificateNumber: z.string().min(1, 'Certificate number is required'),
    categoryCertificateAuthority: z.string().min(1, 'Certificate authority is required'),
    categoryCertificateIssueDate: z.string().min(1, 'Certificate issue date is required'),
    isPwd: z.boolean().default(false),
    isExServiceman: z.boolean().default(false),
    declaration: z.literal(true, {
      errorMap: () => ({
        message: 'You must agree to the declaration to proceed.',
      }),
    }),
    contractualExperienceCertificateUrl: z.string().url().min(1, 'Experience certificate PDF URL is required'),
    agreementCopyUrl: z.string().url().min(1, 'Agreement copy PDF URL is required'),
  }),
});

// ── Candidate Step 2 Schema ────────────────────────────────────
export const candidateStep2Schema = z.object({
  reservationCategory: z
    .object({
      // Local Resident
      isLocallyResident: z.union([z.boolean(), z.string()]),

      localDistrictId: z.number().int().optional(),

      // Domicile
      isJharkhandDomicile: z.boolean(),

      domicileCertificateNumber: z.string().optional(),
      domicileCertificateAuthority: z.string().optional(),
      domicileCertificateIssueDate: z.string().optional().or(z.literal('')),

      // Category
      mainCategory: z.number().int(),
      subCategory: z.number().int().optional().nullable(),
      subSubCategoryId: z.number().int().optional().nullable(),

      categoryCertificateNumber: z.string().optional(),
      categoryCertificateAuthority: z.string().optional(),
      categoryCertificateIssueDate: z.string().optional().or(z.literal('')),

      // PwD
      isPwd: z.boolean(),

      pwdType: z.number().int().optional(),

      pwdPercentage: z.number().min(0).max(100).optional(),

      pwdCertificateNumber: z.string().optional(),
      pwdCertificateAuthority: z.string().optional(),
      pwdCertificateIssueDate: z.string().optional().or(z.literal('')),

      // Ex-Serviceman
      isExServiceman: z.boolean(),

      exServicemanYears: z.number().int().min(0).optional(),

      // Sports
      isSportsQuota: z.boolean(),

      sportsLevel: z.string().optional(),
      sportsAchievement: z.string().optional(),
      sportsCertificateNumber: z.string().optional(),
      sportsCertificateAuthority: z.string().optional(),
      sportsCertificateIssueDate: z.string().optional().or(z.literal('')),

      // Declaration
      declaration: z.literal(true, {
        errorMap: () => ({
          message: 'You must agree to the declaration to proceed.',
        }),
      }),
    })
    .superRefine((data, ctx) => {
      // Local Resident Validation removed as per request

      // Domicile Validation
      if (data.isJharkhandDomicile) {
        if (!data.domicileCertificateNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['domicileCertificateNumber'],
            message: 'Please enter your domicile certificate number.',
          });
        }
      }

      // PwD Validation
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

      // Ex-Serviceman Validation
      if (data.isExServiceman && !data.exServicemanYears) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['exServicemanYears'],
          message: 'Please enter your total years of service.',
        });
      }

      // Sports Quota Validation
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
  subjects: z.object({
    paperOne: z.string().optional(),
    paperTwo: z.string().optional(),
    paperThreeForPost4: z.string().optional(),
    paperThreeForPost6: z.string().optional(),
    paperThreeForPost7: z.string().optional(),
    paperThreeLanguage: z.string().optional(),
    hasPost4: z.boolean().optional(),
    hasPost6: z.boolean().optional(),
    hasPost7: z.boolean().optional(),
    isPostId4And7: z.boolean().optional(),
  }),
});

export type CandidateStep4Input = z.infer<typeof candidateStep4Schema>;

export const candidateStep5Schema = z.object({
  tenthMarksheet: z.string().uuid('Tenth marksheet is required'),
  twelfthMarksheet: z.string().uuid().optional().nullable().or(z.literal('')),
  graduationMarksheet: z.string().uuid().optional().nullable().or(z.literal('')),
  postGraduationCertificate: z.string().uuid().optional().nullable().or(z.literal('')),
  diplomaCertificate: z.string().uuid().optional().nullable().or(z.literal('')),
  experienceCertificate: z.string().uuid().optional().nullable().or(z.literal('')),
  contractualServiceCertificate: z.string().uuid().optional().nullable().or(z.literal('')),
  ewsCertificate: z.string().uuid().optional().nullable().or(z.literal('')),
  aadharCard: z.string().uuid().optional().nullable().or(z.literal('')),
  signature: z.string().uuid('Signature is required'),
  photo: z.string().uuid('Photo is required'),
  domicileCertificate: z.string().uuid().optional().nullable().or(z.literal('')),
  castCertificate: z.string().uuid().optional().nullable().or(z.literal('')),
  sportsCertificate: z.string().uuid().optional().nullable().or(z.literal('')),
  pwdCertificate: z.string().uuid().optional().nullable().or(z.literal('')),
  declarationAccepted: z.boolean().optional().default(true),
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
