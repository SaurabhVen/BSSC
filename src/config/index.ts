import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test', 'dev']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://postgres:postgres@localhost:5432/candidate_portal'),

  DB_SSL: z.preprocess((val) => val === 'true', z.boolean()).default(false),

  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional().default('mock-key'),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default('mock-secret'),

  COGNITO_USER_POOL_ID: z.string().optional().default('us-east-1_mockPoolId'),
  COGNITO_CLIENT_ID: z.string().optional().default('mockClientId1234567890'),
  COGNITO_CLIENT_SECRET: z.string().optional().default('mockClientSecret1234567890'),

  JWT_SECRET: z.string().default('super-secret-jwt-key-for-local-development-only-12345678'),
  S3_BUCKET: z.string().default('candidate-portal-documents-bucket'),
  SECRETS_MANAGER_NAME: z.string().default('candidate-portal/secrets'),

  MOCK_COGNITO: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  MOCK_S3: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  MOCK_PAYMENT: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  MOCK_SMS_EMAIL: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  PRESIGNED_URL_VIEW_EXPIRY: z.coerce.number().default(300),
  PRESIGNED_URL_DOWNLOAD_EXPIRY: z.coerce.number().default(300),

  RAZORPAY_KEY_ID: z.string().optional().default('rzp_test_mock_key'),
  RAZORPAY_SECRET: z.string().optional().default('rzp_test_mock_secret'),
  GETEPAY_MID: z.string().optional().default('1401317'),
  GETEPAY_TERMINAL_ID: z.string().optional().default('getepay.merchant1124894@axisbank'),
  GETEPAY_KEY: z.string().optional().default('Iu7qyZORZ2ONsxdYvqKkyJIS8XP1uMQKe3cr+pkcfoQ='),
  GETEPAY_IV: z.string().optional().default('IosadgLAo1VYToxCg79uQg=='),
  GETEPAY_URL: z.string().optional().default('https://portal.getepay.in:8443/getepayPortal/pg/generateInvoice'),
  GETEPAY_REQUERY_URL: z.string().optional().default('https://portal.getepay.in:8443/getepayPortal/pg/invoiceStatus'),
  GETEPAY_RETURN_URL: z.string().optional().default('https://api-jtglcce.panjikaran.in'),
  FRONTEND_URL: z.string().optional().default('https://jtglcce-2026.panjikaran.in'),
  SES_SOURCE_EMAIL: z.string().optional().default('noreply@bssc-portal.gov.in'),

  // BSSC Fee Settings
  FEE_UR_EBC_BC_MALE: z.coerce.number().default(100),
  FEE_SC_ST_BIHAR: z.coerce.number().default(100),
  FEE_PWD_BIHAR: z.coerce.number().default(100),
  FEE_WOMEN_BIHAR: z.coerce.number().default(100),
  FEE_OUTSIDE_BIHAR: z.coerce.number().default(100),
});

export type AppConfig = z.infer<typeof envSchema>;

const parseEnv = (): AppConfig => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment validation failed:', result.error.format());
    throw new Error('Invalid environment variables');
  }
  return result.data;
};

export const config: AppConfig = parseEnv();
export default config;
