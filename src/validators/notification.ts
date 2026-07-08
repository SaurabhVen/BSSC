import { z } from 'zod';

export const sendEmailNotificationSchema = z.discriminatedUnion('templateType', [
  z.object({
    templateType: z.literal('registrationSuccess'),
    email: z.string().email(),
    details: z.object({
      candidateName: z.string(),
      examName: z.string().optional(),
      password: z.string().optional(),
      loginUrl: z.string().optional(),
      email: z.string().optional(),
      applicationNo: z.string().optional(),
    }),
  }),
  z.object({
    templateType: z.literal('submissionSuccess'),
    email: z.string().email(),
    details: z.object({
      candidateName: z.string(),
      examName: z.string().optional(),
      applicationNo: z.string(),
      transactionId: z.string(),
      dateTime: z.string(),
      amount: z.string(),
      websiteUrl: z.string().optional(),
    }),
  }),
  z.object({
    templateType: z.literal('emailOtp'),
    email: z.string().email(),
    details: z.object({
      otp: z.string(),
      examName: z.string().optional(),
    }),
  }),
]);

export type SendEmailNotificationInput = z.infer<typeof sendEmailNotificationSchema>;
