import { z } from 'zod';

export const createPaymentSchema = z.object({
  candidate_id: z.string().uuid('Invalid candidate ID format'),
  exam_id: z.number().int().positive('Exam ID must be a positive integer'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('INR'),
});

export const verifyPaymentSchema = z.object({
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  gatewayResponse: z.record(z.unknown()).optional(),
  // Razorpay
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
  // Getepay
  getepay_payment_id: z.string().optional(),
  // Easebuzz
  easebuzz_status: z.string().optional(),
  easebuzz_hash: z.string().optional(),
});

export const refundPaymentSchema = z.object({
  transaction_id: z.string().min(1, 'Transaction ID is required'),
});
