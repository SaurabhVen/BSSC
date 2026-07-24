// ============================================================
// Shared Type Definitions for Candidate Portal Backend
// ============================================================

import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

// ── Lambda ──────────────────────────────────────────────────

export type LambdaEvent = APIGatewayProxyEventV2;
export type LambdaContext = Context;

export interface ParsedRequest {
  body: Record<string, unknown>;
  pathParameters: Record<string, string>;
  queryStringParameters: Record<string, string>;
  headers: Record<string, string>;
  requestContext: Record<string, unknown>;
}

export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

// ── User / Auth ──────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  email: string;
  roles: string[];
}

export interface LoginTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresIn: number;
}

// ── Candidate ────────────────────────────────────────────────

export interface CandidateSummary {
  candidateId: string;
  registrationNumber: string;
  fullName: string;
}

export interface CandidateRegistrationResult {
  candidateId: string;
  registrationNumber: string;
  mobileVerified: boolean;
  emailVerified: boolean;
}

// ── OTP ──────────────────────────────────────────────────────

export interface OtpSendResult {
  otpRequestId: string;
  expiresInSeconds: number;
  resendAllowedAfterSeconds: number;
}

export interface OtpVerifyResult {
  verified: boolean;
  token: string;
}

// ── Application ──────────────────────────────────────────────

export interface ApplicationStepData {
  applicationId: string;
  savedStep: number;
  currentStep: number;
  status: string;
  updatedAt: Date;
}

export interface ApplicationDraft {
  applicationId: string;
  candidateId: string;
  status: 'draft' | 'submitted' | 'locked';
  currentStep: number;
  completedSteps: number[];
  isSubmitted: boolean;
  application: ApplicationPayload;
}

export interface ApplicationPayload {
  [key: string]: Record<string, unknown> | null;
}

// ── Document ─────────────────────────────────────────────────

export interface FileObject {
  filename: string;
  mimeType: string;
  content: Buffer;
  size: number;
}

export interface DocumentUploadResult {
  documentId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}

// ── Payment ──────────────────────────────────────────────────

export interface PaymentInitiateResult {
  paymentOrderId: string;
  amount: number;
  currency: string;
  paymentUrl: string;
  key?: string;
  name?: string;
  description?: string;
  prefill?: {
    name: string;
    email: string;
    contact: string;
  };
  paymentStatus?: string;
  isFree?: boolean;
  encData?: string;
  merchIdVal?: string;
  sbiPayment?: boolean;
  htmlForm?: string;
}

export interface PaymentVerifyResult {
  paymentStatus: string;
  transactionId: string;
  paidAmount: number;
}

// ── Dashboard ────────────────────────────────────────────────

export interface DashboardData {
  candidateName: string;
  registrationNumber: string;
  applicationStatus: string;
  paymentStatus: string;
  verificationStatus: string;
  admitCard: { available: boolean; downloadUrl: string | null };
  notices: Array<Record<string, unknown>>;
}

// ── DB Row Types ─────────────────────────────────────────────

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roleId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateRow {
  id: string;
  userId: string;
  registrationNumber: string;
  dateOfBirth: Date;
  mobileNumber: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  mobileVerificationToken: string | null;
  emailVerificationToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationRow {
  id: string;
  candidateId: string;
  status: string;
  currentStep: number;
  completedSteps: number[];
  isSubmitted: boolean;
  applicationReferenceNumber: string | null;
  submissionDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OtpRow {
  id: string;
  otpRequestId: string;
  type: string;
  recipient: string;
  code: string;
  verified: boolean;
  token: string | null;
  purpose: string;
  expiresAt: Date;
  resendAt: Date;
  createdAt: Date;
}

export interface CaptchaRow {
  id: string;
  code: string;
  expiresAt: Date;
}

export interface DocumentRow {
  id: string;
  candidateId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}

export interface PaymentRow {
  id: string;
  applicationId: string;
  paymentOrderId: string;
  amount: string;
  currency: string;
  transactionId: string | null;
  status: string;
  paymentMode: string | null;
  bankName: string | null;
  paymentUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
