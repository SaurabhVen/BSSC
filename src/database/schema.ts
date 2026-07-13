import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  uuid,
  jsonb,
  numeric,
  index,
  uniqueIndex,
  bigint,
  bigserial,
  smallint,
  serial,
} from 'drizzle-orm/pg-core';

// ── Roles ────────────────────────────────────────────────────

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by'),
  version: integer('version').default(1).notNull(),
});

// ── Users ────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),

    fullName: varchar('full_name', { length: 200 }).notNull(),

    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),

    // NEW: Cognito Sub ID
    cognitoSubId: uuid('cognito_sub_id').unique(),
    // or if you want strict UUID validation:
    // cognitoSubId: uuid('cognito_sub_id').unique().notNull(),

    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),

    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),

    version: integer('version').default(1).notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),

    // NEW INDEX (important for Cognito lookup)
    cognitoSubIdx: uniqueIndex('users_cognito_sub_idx').on(table.cognitoSubId),
  })
);

// ── Candidates ───────────────────────────────────────────────

export const candidates = pgTable(
  'candidates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id)
      .unique(),
    registrationNumber: varchar('registration_number', { length: 20 }).unique(),
    dateOfBirth: timestamp('date_of_birth'),
    mobileNumber: varchar('mobile_number', { length: 15 }),
    alternateNumber: varchar('alternate_number', { length: 15 }),
    mobileVerified: boolean('mobile_verified').default(false).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    
    // Custom BSSC Metadata columns
    gender: varchar('gender', { length: 20 }),
    category: varchar('category', { length: 30 }),
    caste: varchar('caste', { length: 100 }),
    biharDomicile: boolean('bihar_domicile').default(false).notNull(),
    isPwd: boolean('is_pwd').default(false).notNull(),
    disabilityType: varchar('disability_type', { length: 50 }),
    pwd40Percent: boolean('pwd_40_percent').default(false).notNull(),
    isExServiceman: boolean('is_ex_serviceman').default(false).notNull(),
    isNccCadet: boolean('is_ncc_cadet').default(false).notNull(),
    isBiharGovtEmp: boolean('is_bihar_govt_emp').default(false).notNull(),
    isContractualEmp: boolean('is_contractual_emp').default(false).notNull(),
    bsscAttempts: integer('bssc_attempts').default(1).notNull(),
    nonCreamyLayer: boolean('non_creamy_layer').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    version: integer('version').default(1).notNull(),
  },
  (table) => ({
    userIdIdx: index('candidates_user_id_idx').on(table.userId),
    regNoIdx: uniqueIndex('candidates_reg_no_idx').on(table.registrationNumber),
  })
);

// ── Applications ─────────────────────────────────────────────

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id),
    status: varchar('status', { length: 30 }).default('draft').notNull(),
    currentStep: integer('current_step').default(0).notNull(),
    completedSteps: jsonb('completed_steps').$type<number[]>().default([]).notNull(),
    isSubmitted: boolean('is_submitted').default(false).notNull(),
    applicationReferenceNumber: varchar('application_reference_number', { length: 30 }),
    submissionDate: timestamp('submission_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    version: integer('version').default(1).notNull(),
  },
  (table) => ({
    candidateIdIdx: index('applications_candidate_id_idx').on(table.candidateId),
    statusIdx: index('applications_status_idx').on(table.status),
  })
);

// ── Application Step Data ─────────────────────────────────────

export const applicationStepData = pgTable(
  'application_step_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    stepNumber: integer('step_number').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    version: integer('version').default(1).notNull(),
  },
  (table) => ({
    appStepIdx: uniqueIndex('app_step_idx').on(table.applicationId, table.stepNumber),
  })
);

// ── Final Submissions ─────────────────────────────────────────

export const finalSubmissions = pgTable('final_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id),
  candidateId: uuid('candidate_id')
    .notNull()
    .references(() => candidates.id),
  payload: jsonb('payload').$type<Record<string, any>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Documents ─────────────────────────────────────────────────

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileUrl: text('file_url').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),
    isVerified: boolean('is_verified').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    version: integer('version').default(1).notNull(),
  },
  (table) => ({
    candidateDocIdx: index('documents_candidate_id_idx').on(table.candidateId),
    docTypeIdx: index('documents_doc_type_idx').on(table.documentType),
  })
);

// ── Payments ──────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    paymentOrderId: varchar('payment_order_id', { length: 100 }).notNull().unique(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    transactionId: varchar('transaction_id', { length: 100 }),
    status: varchar('status', { length: 30 }).default('pending').notNull(),
    paymentMode: varchar('payment_mode', { length: 50 }),
    bankName: varchar('bank_name', { length: 100 }),
    paymentUrl: text('payment_url'),
    gatewayResponse: jsonb('gateway_response').$type<Record<string, unknown>>(),
    payJson: text('pay_json'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    version: integer('version').default(1).notNull(),
  },
  (table) => ({
    appPaymentIdx: index('payments_application_id_idx').on(table.applicationId),
    paymentOrderIdx: uniqueIndex('payments_order_id_idx').on(table.paymentOrderId),
  })
);

// ── Invoices ──────────────────────────────────────────────────

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  issueDate: timestamp('issue_date').defaultNow().notNull(),
  dueDate: timestamp('due_date'),
  status: varchar('status', { length: 20 }).default('paid').notNull(),
  pdfUrl: text('pdf_url'),
  details: jsonb('details').$type<Record<string, any>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── OTPs ──────────────────────────────────────────────────────

export const otps = pgTable(
  'otps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    otpRequestId: varchar('otp_request_id', { length: 64 }).notNull().unique(),
    type: varchar('type', { length: 10 }).notNull(),
    recipient: varchar('recipient', { length: 255 }).notNull(),
    code: varchar('code', { length: 10 }).notNull(),
    verified: boolean('verified').default(false).notNull(),
    token: text('token'),
    purpose: varchar('purpose', { length: 50 }).default('verification').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    resendAt: timestamp('resend_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    version: integer('version').default(1).notNull(),
  },
  (table) => ({
    otpRecipientIdx: index('otps_recipient_idx').on(table.recipient),
    otpExpiresIdx: index('otps_expires_at_idx').on(table.expiresAt),
  })
);

// ── CAPTCHAs ──────────────────────────────────────────────────

export const captchas = pgTable(
  'captchas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 20 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    updatedBy: uuid('updated_by'),
    version: integer('version').default(1).notNull(),
  },
  (table) => ({
    captchaExpiresIdx: index('captchas_expires_at_idx').on(table.expiresAt),
  })
);

// ── Categories ────────────────────────────────────────────────
export const categories = pgTable('categories', {
  catId: bigserial('cat_id', { mode: 'number' }).primaryKey(),
  catUserId: bigint('cat_user_id', { mode: 'number' }).notNull(),
  catName: varchar('cat_name', { length: 255 }).notNull(),
  catValue: varchar('cat_value', { length: 255 }),
  catParentId: bigint('cat_parent_id', { mode: 'number' }),
  catPublish: smallint('cat_publish').default(1),
});

// ── Educations ────────────────────────────────────────────────
export const educations = pgTable('educations', {
  eduId: bigserial('edu_id', { mode: 'number' }).primaryKey(),
  eduUserId: bigint('edu_user_id', { mode: 'number' }).notNull(),
  eduName: varchar('edu_name', { length: 255 }).notNull(),
});

// ── Subjects ──────────────────────────────────────────────────

export const subjects = pgTable('subjects', {
  subjectId: serial('subject_id').primaryKey(),
  subjectName: varchar('subject_name', { length: 150 }).unique().notNull(),
});

// ── Posts ─────────────────────────────────────────────────────
export const posts = pgTable('posts', {
  postCode: varchar('post_code', { length: 10 }).primaryKey(),
  postName: varchar('post_name', { length: 200 }).notNull(),
});

// ── Countries ────────────────────────────────────────────────
export const countries = pgTable('countries', {
  countryId: bigserial('country_id', { mode: 'number' }).primaryKey(),
  countryName: varchar('country_name', { length: 100 }).notNull(),
  countryCode: varchar('country_code', { length: 10 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── States ───────────────────────────────────────────────────
export const states = pgTable('states', {
  stateId: bigserial('state_id', { mode: 'number' }).primaryKey(),
  countryId: bigint('country_id', { mode: 'number' })
    .notNull()
    .references(() => countries.countryId, { onDelete: 'restrict' }),
  stateName: varchar('state_name', { length: 100 }).notNull(),
  stateCode: varchar('state_code', { length: 10 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Districts ────────────────────────────────────────────────
export const districts = pgTable('districts', {
  districtId: bigserial('district_id', { mode: 'number' }).primaryKey(),
  stateId: bigint('state_id', { mode: 'number' })
    .notNull()
    .references(() => states.stateId, { onDelete: 'restrict' }),
  districtName: varchar('district_name', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Job Qualifications ─────────────────────────────────────────
export const jobQualifications = pgTable('job_qualifications', {
  slNo: integer('sl_no').primaryKey(),
  qualification: text('qualification').notNull(),
  eligiblePostCode: varchar('eligible_post_code', { length: 20 }).notNull(),
  mainPosts: text('main_posts').notNull(),
  preferenceApplicable: varchar('preference_applicable', { length: 3 }).notNull(),
});

// ── Candidate Qualifications ──────────────────────────────────
export const candidateQualifications = pgTable('candidate_qualifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id),
  level: varchar('level', { length: 50 }).notNull(),
  degree: varchar('degree', { length: 100 }),
  boardUniversity: varchar('board_university', { length: 255 }),
  totalMarks: integer('total_marks'),
  marksObtained: integer('marks_obtained'),
  percentage: numeric('percentage', { precision: 5, scale: 2 }),
  specialization: varchar('specialization', { length: 100 }),
  passingYear: varchar('passing_year', { length: 20 }),
  jobQualificationId: integer('job_qualification_id').references(() => jobQualifications.slNo),
});

// ── Candidate Post Preferences ────────────────────────────────
export const candidatePostPreferences = pgTable('candidate_post_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id),
  postCode: varchar('post_code', { length: 10 })
    .notNull()
    .references(() => posts.postCode),
  priority: integer('priority').notNull(),
  isRegular: boolean('is_regular').default(true),
  isBacklog: boolean('is_backlog').default(false),
});

// ── Candidate Languages ───────────────────────────────────────
export const candidateLanguages = pgTable('candidate_languages', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id),
  paperOneLanguage: varchar('paper_one_language', { length: 100 }),
  paperTwoLanguage: varchar('paper_two_language', { length: 100 }),
  paperThreeLanguage: varchar('paper_three_language', { length: 100 }),
});

// ── Degrees ──────────────────────────────────────────────────
export const degrees = pgTable('degrees', {
  degreeId: serial('degree_id').primaryKey(),
  degreeName: varchar('degree_name', { length: 255 }).notNull().unique(),
  degreeType: varchar('degree_type', { length: 255 }).notNull(),
});
export const degreePostMap = pgTable('degree_post_map', {
  id: serial('id').primaryKey(),
  degreeId: integer('degree_id').references(() => degrees.degreeId, { onDelete: 'cascade' }),
  postCode: varchar('post_code', { length: 10 }).references(() => posts.postCode, {
    onDelete: 'cascade',
  }),
  degreeType: varchar('degree_type', { length: 255 }).notNull(),
});

// post_mapping
export const postMapping = pgTable('post_mapping', {
  id: serial('id').primaryKey(),
  postCode: varchar('post_code', { length: 10 }).references(() => posts.postCode, {
    onDelete: 'cascade',
  }),
  degreeId: integer('degree_id').references(() => degrees.degreeId, { onDelete: 'set null' }),
});

export const jobEligibility = pgTable('job_eligibility', {
  id: serial('id').primaryKey(),
  degreeId: integer('degree_id').references(() => degrees.degreeId, { onDelete: 'set null' }),
  subjectId: integer('subject_id').references(() => subjects.subjectId, { onDelete: 'set null' }),
  postCode: varchar('post_code', { length: 10 }).references(() => posts.postCode, {
    onDelete: 'cascade',
  }),
  isHonours: boolean('is_honours').default(false),
  hasMathSubsidiary: boolean('has_math_subsidiary').default(false),
  preferenceApplicable: varchar('preference_applicable', { length: 3 }).default('No').notNull(),
  specializationNotes: text('specialization_notes'),
});

// ── Exported ───────────────────────────────────────────────────

// ── Disabilities ──────────────────────────────────────────────
export const disabilities = pgTable('disabilities', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
});

// ── Payment Gateways ──────────────────────────────────────────
export const paymentGateways = pgTable('payment_gateways', {
  id: uuid('id').primaryKey().defaultRandom(),
  gatewayName: varchar('gateway_name', { length: 50 }).notNull().unique(),
  isActive: boolean('is_active').default(false).notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by'),
  version: integer('version').default(1).notNull(),
});

// ── Payment Transactions ──────────────────────────────────────
export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: varchar('transaction_id', { length: 100 }).notNull().unique(),
  candidateId: uuid('candidate_id')
    .notNull()
    .references(() => candidates.id),
  examId: integer('exam_id'),
  gatewayId: uuid('gateway_id').references(() => paymentGateways.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('INR').notNull(),
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending').notNull(),
  gatewayResponse: jsonb('gateway_response').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by'),
  version: integer('version').default(1).notNull(),
});

// ── Payment Logs ──────────────────────────────────────────────
export const paymentLogs = pgTable('payment_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: varchar('transaction_id', { length: 100 }).notNull(),
  gatewayName: varchar('gateway_name', { length: 50 }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  requestPayload: jsonb('request_payload').$type<Record<string, unknown>>(),
  responsePayload: jsonb('response_payload').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by'),
  version: integer('version').default(1).notNull(),
});

// ── Payment Refunds ───────────────────────────────────────────
export const paymentRefunds = pgTable('payment_refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: varchar('transaction_id', { length: 100 }).notNull(),
  refundId: varchar('refund_id', { length: 100 }).notNull().unique(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  refundStatus: varchar('refund_status', { length: 50 }).default('pending').notNull(),
  gatewayResponse: jsonb('gateway_response').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by'),
  version: integer('version').default(1).notNull(),
});
// ── Type of Ex-Officers ───────────────────────────────────────
export const typeOfExOfficers = pgTable('type_of_ex_officers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

export type ApplicationStepDatum = typeof applicationStepData.$inferSelect;
export type NewApplicationStepDatum = typeof applicationStepData.$inferInsert;

export type FinalSubmission = typeof finalSubmissions.$inferSelect;
export type NewFinalSubmission = typeof finalSubmissions.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Otp = typeof otps.$inferSelect;
export type NewOtp = typeof otps.$inferInsert;

export type Captcha = typeof captchas.$inferSelect;
export type NewCaptcha = typeof captchas.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Education = typeof educations.$inferSelect;
export type NewEducation = typeof educations.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;

export type State = typeof states.$inferSelect;
export type NewState = typeof states.$inferInsert;

export type District = typeof districts.$inferSelect;
export type NewDistrict = typeof districts.$inferInsert;

export type JobQualification = typeof jobQualifications.$inferSelect;
export type NewJobQualification = typeof jobQualifications.$inferInsert;

export type Degree = typeof degrees.$inferSelect;
export type NewDegree = typeof degrees.$inferInsert;

export type JobEligibility = typeof jobEligibility.$inferSelect;
export type NewJobEligibility = typeof jobEligibility.$inferInsert;

export type Disability = typeof disabilities.$inferSelect;
export type NewDisability = typeof disabilities.$inferInsert;

export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type NewPaymentGateway = typeof paymentGateways.$inferInsert;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;

export type PaymentLog = typeof paymentLogs.$inferSelect;
export type NewPaymentLog = typeof paymentLogs.$inferInsert;

export type PaymentRefund = typeof paymentRefunds.$inferSelect;
export type NewPaymentRefund = typeof paymentRefunds.$inferInsert;

export type TypeOfExOfficer = typeof typeOfExOfficers.$inferSelect;
export type NewTypeOfExOfficer = typeof typeOfExOfficers.$inferInsert;
