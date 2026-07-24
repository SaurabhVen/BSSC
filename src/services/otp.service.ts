import { otpRepository } from '../repositories/common.repository';
import { generateOTP, generateRandomToken } from '../utils/crypto';
import { AppError, TooManyRequestsError, NotFoundError } from '../errors/AppError';
import type {
  SendMobileOtpInput,
  VerifyMobileOtpInput,
  SendEmailOtpInput,
  VerifyEmailOtpInput,
  ResendOtpInput,
} from '../validators/auth';
import type { OtpSendResult, OtpVerifyResult } from '../types';
import config from '../config';
import { sendSms } from '../utils/sms';
import { sendEmail } from '../utils/email';

const OTP_EXPIRY_SECONDS = 600; // 10 minutes
const OTP_RESEND_SECONDS = 60; // 1 minute

const mockSendSms = async (mobile: string, otp: string): Promise<void> => {
  console.log(`[MOCK SMS] Sending OTP ${otp} to mobile: ${mobile}`);
};

const mockSendEmail = async (email: string, otp: string): Promise<void> => {
  console.log(`[MOCK EMAIL] Sending OTP ${otp} to email: ${email}`);
};

export class OtpService {
  // ── Send Mobile OTP ───────────────────────────────────────────

  async sendMobileOtp(input: SendMobileOtpInput): Promise<OtpSendResult> {
    const otpCode = generateOTP(6);
    const otpRequestId = generateRandomToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_SECONDS * 1000);
    const resendAt = new Date(now.getTime() + OTP_RESEND_SECONDS * 1000);

    await otpRepository.create({
      otpRequestId,
      type: 'mobile',
      recipient: input.mobileNumber,
      code: otpCode,
      purpose: input.purpose,
      expiresAt,
      resendAt,
    });

    if (config.MOCK_SMS_EMAIL) {
      await mockSendSms(input.mobileNumber, otpCode);
    } else {
      // Integrate real SMS provider here (SNS, Twilio, etc.)
      const message = `Dear Candidate ,\nYour One-Time Password OTP  for verification is: ${otpCode} \nPlease do not share it with anyone.-Team BSSC\nJTGLCC\nCyberica (CNTPL)`;
      await sendSms({ mobile: input.mobileNumber, message, templateId: '1207178152978600853' });
      console.log(`[OTP] Sent mobile OTP to: ${input.mobileNumber}`);
    }

    return {
      otpRequestId,
      expiresInSeconds: OTP_EXPIRY_SECONDS,
      resendAllowedAfterSeconds: OTP_RESEND_SECONDS,
    };
  }

  // ── Verify Mobile OTP ─────────────────────────────────────────

  async verifyMobileOtp(input: VerifyMobileOtpInput): Promise<OtpVerifyResult> {
    const otpRecord = await otpRepository.findByRequestId(input.otpRequestId);

    if (!otpRecord) throw new NotFoundError('OTP request not found or expired');
    if (otpRecord.verified)
      throw new AppError('This OTP has already been used. Please request a new one.', 422);
    if (otpRecord.expiresAt < new Date())
      throw new AppError('This OTP has expired. Please request a new code to continue.', 422);
    if (otpRecord.code !== input.otp.trim()) {
      throw new AppError(
        'The OTP you entered is incorrect. Please check your messages and try again.',
        422
      );
    }

    const token = generateRandomToken();
    await otpRepository.markVerified(otpRecord.id, token);

    return { verified: true, token };
  }

  // ── Send Email OTP ────────────────────────────────────────────

  async sendEmailOtp(input: SendEmailOtpInput): Promise<OtpSendResult> {
    const otpCode = generateOTP(6);
    const otpRequestId = generateRandomToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_SECONDS * 1000);
    const resendAt = new Date(now.getTime() + OTP_RESEND_SECONDS * 1000);

    await otpRepository.create({
      otpRequestId,
      type: 'email',
      recipient: input.email,
      code: otpCode,
      purpose: input.purpose,
      expiresAt,
      resendAt,
    });

    if (config.MOCK_SMS_EMAIL) {
      await mockSendEmail(input.email, otpCode);
    } else {
      const subject = 'Email Verification OTP for BSSC Examination Registration';
      const html = `
        <p>Dear Candidate,</p>
        <p>Thank you for initiating the registration process for the BSSC Examination under the Jharkhand Staff Selection Commission (BSSC).</p>
        <p>To verify your email address and proceed with the registration, please use the following One-Time Password (OTP):</p>
        <p><b>OTP: ${otpCode}</b></p>
        <p>This OTP is valid for 10 minutes. Please do not share this OTP with anyone. If you did not initiate this request, please ignore this email.</p>
        <p>Best Regards,<br/>Jharkhand Staff Selection Commission (BSSC)<br/>(This is an auto-generated email. Please do not reply.)</p>
      `;
      await sendEmail({ to: input.email, subject, html });
      console.log(`[OTP] Sent email OTP to: ${input.email}`);
    }

    return {
      otpRequestId,
      expiresInSeconds: OTP_EXPIRY_SECONDS,
      resendAllowedAfterSeconds: OTP_RESEND_SECONDS,
    };
  }

  // ── Verify Email OTP ──────────────────────────────────────────

  async verifyEmailOtp(input: VerifyEmailOtpInput): Promise<OtpVerifyResult> {
    const otpRecord = await otpRepository.findByRequestId(input.otpRequestId);

    if (!otpRecord) throw new NotFoundError('OTP request not found or expired');
    if (otpRecord.verified)
      throw new AppError('This OTP has already been used. Please request a new one.', 422);
    if (otpRecord.expiresAt < new Date())
      throw new AppError('This OTP has expired. Please request a new code to continue.', 422);
    if (otpRecord.code !== input.otp.trim())
      throw new AppError(
        'The OTP you entered is incorrect. Please check your messages and try again.',
        422
      );

    const token = generateRandomToken();
    await otpRepository.markVerified(otpRecord.id, token);

    return { verified: true, token };
  }

  // ── Resend OTP ────────────────────────────────────────────────

  async resendOtp(input: ResendOtpInput): Promise<OtpSendResult> {
    const otpRecord = await otpRepository.findByRequestId(input.otpRequestId);
    if (!otpRecord) throw new NotFoundError('OTP request not found');

    if (otpRecord.resendAt > new Date()) {
      const waitSeconds = Math.ceil((otpRecord.resendAt.getTime() - Date.now()) / 1000);
      throw new TooManyRequestsError(
        `Please wait ${waitSeconds} seconds before requesting a new OTP`
      );
    }

    const newOtpCode = generateOTP(6);
    const newOtpRequestId = generateRandomToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_SECONDS * 1000);
    const resendAt = new Date(now.getTime() + OTP_RESEND_SECONDS * 1000);

    await otpRepository.create({
      otpRequestId: newOtpRequestId,
      type: otpRecord.type,
      recipient: otpRecord.recipient,
      code: newOtpCode,
      purpose: otpRecord.purpose,
      expiresAt,
      resendAt,
    });

    if (config.MOCK_SMS_EMAIL) {
      if (otpRecord.type === 'mobile') {
        await mockSendSms(otpRecord.recipient, newOtpCode);
      } else {
        await mockSendEmail(otpRecord.recipient, newOtpCode);
      }
    } else {
      if (otpRecord.type === 'mobile') {
        const message = `Dear Candidate ,\nYour One-Time Password OTP  for verification is: ${newOtpCode} \nPlease do not share it with anyone.-Team BSSC\nJTGLCC\nCyberica (CNTPL)`;
        await sendSms({ mobile: otpRecord.recipient, message, templateId: '1207178152978600853' });
      } else {
        const subject = 'Email Verification OTP for BSSC Examination Registration';
        const html = `
          <p>Dear Candidate,</p>
          <p>Thank you for initiating the registration process for the BSSC Examination under the Bihar Staff Selection Commission (BSSC).</p>
          <p>To verify your email address and proceed with the registration, please use the following One-Time Password (OTP):</p>
          <p><b>OTP: ${newOtpCode}</b></p>
          <p>This OTP is valid for 10 minutes. Please do not share this OTP with anyone. If you did not initiate this request, please ignore this email.</p>
          <p>Best Regards,<br/>Bihar Staff Selection Commission (BSSC)<br/>(This is an auto-generated email. Please do not reply.)</p>
        `;
        await sendEmail({ to: otpRecord.recipient, subject, html });
      }
    }
    return {
      otpRequestId: newOtpRequestId,
      expiresInSeconds: OTP_EXPIRY_SECONDS,
      resendAllowedAfterSeconds: OTP_RESEND_SECONDS,
    };
  }
}

export const otpService = new OtpService();
export default otpService;
