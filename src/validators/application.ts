import { z } from 'zod';

// ==========================================
// STEP 0: Cognito Fetch Data (Bypassed)
// ==========================================
export const step0Schema = z.any();

// ==========================================
// STEP 1: Personal & Reservation Form Details
// ==========================================
export const step1Schema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(200),
  fatherName: z.string().min(1, "Father's name is required").max(200),
  motherName: z.string().min(1, "Mother's name is required").max(200),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required').max(50),
  nationality: z.string().min(1, 'Nationality is required').max(100),
  
  // Mobile validation: exactly 10 digits
  mobileNo: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  mobileNumber: z.string().optional().nullable(),
  confirmMobileNo: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits').optional().nullable().or(z.literal('')),
  
  emailId: z.string().min(1, 'Email ID is required'),
  
  // Custom Registration Fields
  oldRegistrationNumber: z.string().optional().nullable(),
  previouslyRegistered: z.string().optional().nullable(),
  governmentIdNumber: z.string().max(50).optional().nullable().or(z.literal('')),
  
  // Domicile Details
  isBiharDomicile: z.boolean().default(false).optional(),
  domicileOfBihar: z.string().optional().nullable(),
  domicileCertificateNumber: z.string().optional().nullable().or(z.literal('')),
  domicileCertificateAuthority: z.string().optional().nullable().or(z.literal('')),
  domicileCertificateIssueDate: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val) return true;
        let dStr = val.trim();
        if (!dStr) return true;

        if (dStr.includes('-') && dStr.split('-')[0].length <= 2) {
          const parts = dStr.split('-');
          dStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else if (dStr.includes('/') && dStr.split('/')[0].length <= 2) {
          const parts = dStr.split('/');
          dStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else if (dStr.includes('/')) {
          dStr = dStr.replace(/\//g, '-');
        }

        const parsedDate = new Date(dStr);
        if (isNaN(parsedDate.getTime())) return true;

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return parsedDate <= today;
      },
      {
        message: 'Domicile certificate issue date cannot be in the future',
      }
    ),
  isLocallyResident: z.union([z.boolean(), z.string()]).optional().nullable(),
  localDistrictId: z.number().optional().nullable(),

  // Category & Caste Details
  mainCategory: z.number().optional().nullable(),
  subCategory: z.number().optional().nullable(),
  subSubCategoryId: z.number().optional().nullable(),
  categoryCertificateNumber: z.string().optional().nullable().or(z.literal('')),
  categoryCertificateAuthority: z.string().optional().nullable().or(z.literal('')),
  categoryCertificateIssueDate: z.string().optional().nullable().or(z.literal('')),

  // PwD Details
  isPwd: z.boolean().default(false).optional(),
  pwdType: z.number().optional().nullable(),
  pwdPercentage: z.number().optional().nullable(),
  pwdCertificateNumber: z.string().optional().nullable().or(z.literal('')),
  pwdCertificateAuthority: z.string().optional().nullable().or(z.literal('')),
  pwdCertificateIssueDate: z.string().optional().nullable().or(z.literal('')),

  // Ex-Serviceman Details
  isExServiceman: z.boolean().default(false).optional(),
  exServicemanYears: z.number().optional().nullable(),

  // Sports Quota Details
  isSportsQuota: z.boolean().default(false).optional(),
  sportsLevel: z.string().optional().nullable().or(z.literal('')),
  sportsAchievement: z.string().max(500).optional().nullable().or(z.literal('')),
  sportsCertificateNumber: z.string().optional().nullable().or(z.literal('')),
  sportsCertificateAuthority: z.string().optional().nullable().or(z.literal('')),
  sportsCertificateIssueDate: z.string().optional().nullable().or(z.literal('')),

  // Other Details
  maritalStatus: z.string().max(50).optional().nullable().or(z.literal('')),
  identityType: z.string().max(50).optional().nullable().or(z.literal('')),
  identityNumber: z.string().max(50).optional().nullable().or(z.literal('')),
  identificationMark1: z.string().max(255).optional().nullable().or(z.literal('')),
  identificationMark2: z.string().max(255).optional().nullable().or(z.literal('')),
  alternateNumber: z.string().optional().nullable().or(z.literal('')),

  // Aadhaar validation: exactly 12 digits (if filled)
  aadharCardNumber: z.string().regex(/^\d{12}$/, 'Aadhaar card must be exactly 12 digits').optional().nullable().or(z.literal('')),
  idProofNo: z.string().optional().nullable().or(z.literal('')),
  typeOfPhotoIdProof: z.string().optional().nullable().or(z.literal('')),
  hasAadharCard: z.string().optional().nullable().or(z.literal('')),
  
  // Pincode validation: exactly 6 digits (if filled)
  permPinCode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits').optional().nullable().or(z.literal('')),
  corrPinCode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits').optional().nullable().or(z.literal('')),
  permVillage: z.string().optional().nullable().or(z.literal('')),
  permPoliceStation: z.string().optional().nullable().or(z.literal('')),
  permPostOffice: z.string().optional().nullable().or(z.literal('')),
  permDistrict: z.string().optional().nullable().or(z.literal('')),
  permDistrictId: z.union([z.string(), z.number()]).optional().nullable(),
  permState: z.string().optional().nullable().or(z.literal('')),
  permStateId: z.union([z.string(), z.number()]).optional().nullable(),
  
  corrVillage: z.string().optional().nullable().or(z.literal('')),
  corrPoliceStation: z.string().optional().nullable().or(z.literal('')),
  corrPostOffice: z.string().optional().nullable().or(z.literal('')),
  corrDistrict: z.string().optional().nullable().or(z.literal('')),
  corrDistrictId: z.union([z.string(), z.number()]).optional().nullable(),
  corrState: z.string().optional().nullable().or(z.literal('')),
  corrStateId: z.union([z.string(), z.number()]).optional().nullable(),

  agreementCircular: z.string().optional().nullable().or(z.literal('')),
  biharGovtEmployee: z.string().optional().nullable().or(z.literal('')),
  contractualEmployee: z.string().optional().nullable().or(z.literal('')),
  disability: z.string().optional().nullable().or(z.literal('')),
  isMarried: z.string().optional().nullable().or(z.literal('')),
  isMin40PercentPwD: z.string().optional().nullable().or(z.literal('')),
  isNonCreamyLayer: z.string().optional().nullable().or(z.literal('')),
  isScribeRequired: z.string().optional().nullable().or(z.literal('')),
  exServiceman: z.string().optional().nullable().or(z.literal('')),
  wardOfFreedomFighter: z.string().optional().nullable().or(z.literal('')),
  sameAsPermanent: z.boolean().optional().nullable(),
  
  declaration: z.boolean().optional(),
  address: z.any().optional(),
});

// ==========================================
// STEP 2: Payment Details validation
// ==========================================
export const step2Schema = z.object({
  paymentMode: z.enum(['online_card', 'online_upi', 'online_netbanking', 'challan']),
  feeCategory: z.enum(['general', 'obc', 'sc_st', 'pwd', 'women', 'outside_bihar']).optional(),
});

// ==========================================
// STEP 3: Educational Qualifications (Array of Level details)
// ==========================================
export const step3Schema = z.object({
  highestQualification: z.string().optional(),
  qualifications: z
    .array(
      z.object({
        level: z.enum([
          'matriculation',
          'intermediate',
          'graduation',
        ]),
        boardUniversity: z.string().min(1, 'Board/University is required').max(255),
        institutionName: z.string().max(255).optional(),
        degree: z.string().min(1, 'Degree name is required').max(255),
        specialization: z.string().max(255).optional(),
        rollNumber: z.string().max(100).optional(),
        yearOfPassing: z.number().int().min(0).max(new Date().getFullYear()).optional(),
        totalMarks: z.number().min(0),
        marksObtained: z.number().min(0),
        percentage: z.number().min(0).max(100).optional().nullable(),
        grade: z.string().max(100).optional(),
        jobQualificationId: z.number().int().optional(),
      })
    )
    .min(1, 'At least one qualification is required'),
});

// ==========================================
// STEP 4: Photo & Signatures UUID S3 Keys
// ==========================================
export const step4Schema = z.object({
  photograph: z.string().uuid('Photograph must be a valid document UUID'),
  signatureEnglish: z.string().uuid('English Signature must be a valid document UUID'),
  signatureHindi: z.string().uuid('Hindi Signature must be a valid document UUID'),
});

// ==========================================
// STEP 5: Live Photograph UUID S3 Key
// ==========================================
export const step5Schema = z.object({
  livePhoto: z.string().uuid('Live Photo must be a valid document UUID'),
});

// ==========================================
// STEP 6, 7, 8: Not Used / Bypassed
// ==========================================
export const step6Schema = z.any();
export const step7Schema = z.any();
export const step8Schema = z.any();

export const updateStepSchema = z.object({
  step: z.number().int().min(0).max(8),
  data: z.record(z.unknown()),
  action: z.enum(['save_draft', 'save_and_next']).default('save_draft'),
});

// Exported Types
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
