import { z } from 'zod';
import { calculateBSSCAge } from '../utils/age';

const mobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number (10 digits starting 6-9)');

const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase();

export const step0Schema = z.object({
  fullName: z.string().min(1).max(200),
  fatherName: z.string().min(1).max(200),
  motherName: z.string().min(1).max(200),
  dateOfBirth: z
    .string()
    .regex(/^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/, 'Invalid date format (dd-mm-yyyy)'),
  age: z.number().int().min(18, 'Age must be at least 18').max(100).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  maritalStatus: z
    .enum(['unmarried', 'married', 'divorced', 'widowed'])
    .optional()
    .or(z.literal(''))
    .nullable(),
  nationality: z.string().min(1).max(100),
  identityType: z.enum(['aadhaar', 'pan', 'passport', 'voter_id', 'driving_license']).optional().nullable().or(z.literal('')),
  identityNumber: z.string().max(50).optional().nullable().or(z.literal('')),
  identificationMark1: z.string().min(1, 'Identification mark 1 is required').max(255),
  identificationMark2: z.string().max(255).optional(),
  mobileNumber: mobileSchema,
  alternateNumber: mobileSchema.optional().or(z.literal('')),
  emailId: emailSchema,
  address: z.object({
    permanent: z.object({
      street: z.string().min(1).max(255),
      post: z.string().min(1).max(100),
      district: z.string().min(1).max(100),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(100),
      pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
      country: z.string().min(1).max(100).default('India'),
    }),
    correspondence: z
      .object({
        sameAsPermanent: z.boolean().default(false),
        street: z.string().max(255).optional(),
        post: z.string().max(100).optional(),
        district: z.string().max(100).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(100).optional(),
        pincode: z
          .string()
          .regex(/^\d{6}$/, 'Pincode must be 6 digits')
          .optional(),
        country: z.string().max(100).optional(),
      })
      .optional(),
  }),
});

// ── Step 1: Reservation Category ─────────────────────────────

export const step1Schema = z.object({
  // Category IDs (from categories table)
  // Reservation Category
  mainCategory: z.number().nullable().optional(),
  subCategory: z.number().nullable().optional(),
  subSubCategoryId: z.number().nullable().optional(),
  categoryCertificateNumber: z.string().nullable().optional(),
  categoryCertificateAuthority: z.string().nullable().optional(),
  categoryCertificateIssueDate: z.string().nullable().optional(),

  // PWD
  isPwd: z.boolean().default(false).optional(),
  pwdType: z.number().nullable().optional(),
  pwdPercentage: z.number().nullable().optional(),
  pwdCertificateNumber: z.string().nullable().optional(),
  pwdCertificateAuthority: z.string().nullable().optional(),
  pwdCertificateIssueDate: z.string().nullable().optional(),

  // Ex-Serviceman
  isExServiceman: z.boolean().default(false).optional(),
  exServicemanYears: z.number().nullable().optional(),

  // Sports Quota
  isSportsQuota: z.boolean().default(false).optional(),
  sportsLevel: z.string().nullable().optional(),
  sportsAchievement: z.string().max(500).nullable().optional(),
  sportsCertificateNumber: z.string().nullable().optional(),
  sportsCertificateAuthority: z.string().nullable().optional(),
  sportsCertificateIssueDate: z.string().nullable().optional(),

  // Domicile
  isJharkhandDomicile: z.boolean().default(false).optional(),
  domicileCertificateNumber: z.string().nullable().optional(),
  domicileCertificateAuthority: z.string().nullable().optional(),
  domicileCertificateIssueDate: z.string().nullable().optional(),

  // Local Residency
  isLocallyResident: z.union([z.boolean(), z.string()]).nullable().optional(),
  localDistrictId: z.number().nullable().optional(),

  // Declaration
  declaration: z.boolean().optional(),
});

// ── Step 2: Education ─────────────────────────────────────────

export const step2Schema = z.object({
  highestQualification: z.string().optional(),
  qualifications: z
    .array(
      z.object({
        level: z.enum([
          'matriculation',
          'intermediate',
          'graduation',
          'post_graduation',
          'doctorate',
          'diploma',
          'certificate',
        ]),
        boardUniversity: z.string().min(1).max(255),
        institutionName: z.string().max(255).optional(),
        degree: z.string().min(1).max(255),
        specialization: z.string().max(255).optional(),
        rollNumber: z.string().max(100).optional(),
        yearOfPassing: z.number().int().min(0).max(new Date().getFullYear()).optional(),
        totalMarks: z.number().min(0),
        marksObtained: z.number().min(0),
        percentage: z.number().min(0).max(100),
        grade: z.string().max(100).optional(), // increased max length for cert numbers
        jobQualificationId: z.number().int().optional(),
      })
    )
    .min(1, 'At least one qualification required'),
});

// ── Step 3: Post Preference ───────────────────────────────────

export const step3Schema = z.union([
  z.object({
    preferredPosts: z
      .array(
        z.object({
          postCode: z.string().min(1).max(20),
          postName: z.string().min(1).max(255),
          department: z.string().min(1).max(255),
          priority: z.number().int().positive(),
        })
      )
      .min(1, 'At least one post preference required')
      .max(5, 'Maximum 5 post preferences allowed'),
  }),
  z.object({
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
]);

// ── Step 4: Language Selection ────────────────────────────────

export const step4Schema = z.object({
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
});

// ── Step 5: Examination Centre Selection ──────────────────────

export const step5Schema = z.object({
  centers: z
    .array(
      z.object({
        centreCode: z.string().min(1).max(20),
        centreName: z.string().min(1).max(255),
        state: z.string().min(1).max(100),
        priority: z.number().int().min(1).max(3),
      })
    )
    .min(1, 'At least one examination centre required')
    .max(3, 'Maximum 3 examination centres allowed'),
});

// ── Step 6: Document Upload ───────────────────────────────────

export const step6Schema = z.object({
  tenthMarksheet: z.string().uuid().optional().nullable().or(z.literal('')),
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

// ── Step 7: Fee Payment ───────────────────────────────────────

export const step7Schema = z.object({
  paymentMode: z.enum(['online_card', 'online_upi', 'online_netbanking', 'challan']),
  feeCategory: z.enum(['general', 'obc', 'sc_st', 'pwd']).optional(),
});

// ── Step 8: Final Review & Submit ────────────────────────────

export const step8Schema = z.object({
  declarationAccepted: z.boolean().refine((v) => v === true, {
    message: 'You must agree to the final declaration to submit your application.',
  }),
  termsAccepted: z.boolean().refine((v) => v === true, {
    message: 'You must accept the terms and conditions to register.',
  }),
  confirmationText: z
    .string()
    .optional()
    .refine((v) => !v || v.trim().toLowerCase() === 'i confirm', {
      message: "Please type 'I CONFIRM' in the box below to proceed with your application.",
    }),
});

// ── Generic Step Update Schema ────────────────────────────────

export const updateStepSchema = z.object({
  step: z.number().int().min(0).max(8),
  data: z.record(z.unknown()),
  action: z.enum(['save_draft', 'save_and_next']).default('save_draft'),
});

// ── Exported Types ────────────────────────────────────────────

export type Step0Input = z.infer<typeof step0Schema>;
export type Step1Input = z.infer<typeof step1Schema>;
export type Step2Input = z.infer<typeof step2Schema>;
export type Step3Input = z.infer<typeof step3Schema>;
export type Step4Input = z.infer<typeof step4Schema>;
export type Step5Input = z.infer<typeof step5Schema>;
export type Step6Input = z.infer<typeof step6Schema>;
export type Step7Input = z.infer<typeof step7Schema>;
export type Step8Input = z.infer<typeof step8Schema>;
export type UpdateStepInput = z.infer<typeof updateStepSchema>;

export const STEP_SCHEMAS = {
  0: step0Schema,
  1: step1Schema,
  2: step2Schema,
  3: step3Schema,
  4: step4Schema,
  5: step5Schema,
  6: step6Schema,
  7: step7Schema,
  8: step8Schema,
} as const;

export type StepNumber = keyof typeof STEP_SCHEMAS;
