import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { paymentService } from '../services/payment.service';
import { userRepository } from '../repositories/user.repository';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { AppError, NotFoundError } from '../errors/AppError';
import { z } from 'zod';
import type { LambdaResponse } from '../types';

const initiatePaymentSchema = z.object({
  applicationId: z.string().uuid('Invalid application ID'),
  paymentMode: z.string().optional(),
  feeCategory: z.string().optional(),
});

const verifyPaymentSchema = z.object({
  paymentOrderId: z.string().optional(),
  transactionId: z.string().optional(),
  paymentStatus: z.string().optional(),
  paymentMode: z.string().optional(),
  bankName: z.string().optional(),
  amount: z.number().optional(),

  // Razorpay
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),

  // Getepay
  getepayPaymentId: z.string().optional(),
});

export class PaymentController {
  // ── POST /payment/initiate ────────────────────────────────────

  async initiate(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { body } = parseEvent(event);
    const input = validate(initiatePaymentSchema, body);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const result = await paymentService.initiatePayment({
      applicationId: input.applicationId,
      candidateId: candidate.id,
      paymentMode: input.paymentMode || 'exempt',
      feeCategory: input.feeCategory || 'general',
    });

    const acceptHeader = event.headers?.accept || event.headers?.Accept || '';
    const isHtmlRequested = acceptHeader.includes('text/html') || body?.html === true || body?.html === 'true' || body?.redirect === true || body?.redirect === 'true';

    if (result.sbiPayment && result.htmlForm && isHtmlRequested) {
      const base64 = Buffer.from(result.htmlForm).toString('base64');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': event.headers?.origin || event.headers?.Origin || '*',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: base64,
        isBase64Encoded: true,
      };
    }

    return response.created({
      message: 'Payment initiated',
      data: result,
    });
  }

  // ── POST /payment/verify ──────────────────────────────────────

  async verify(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { body } = parseEvent(event);
    const input = validate(verifyPaymentSchema, body);
    const result = await paymentService.verifyPayment(input);
    return response.success(200, { message: 'Payment verified', data: result });
  }

  // ── GET /payment/{applicationId}/status ───────────────────────

  async getStatus(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const applicationId = pathParameters.applicationId;
    if (!applicationId) throw new AppError('Application ID is required', 400);

    const candidate = await userRepository.findCandidateByUserId(user.userId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');

    const payments = await paymentService.getPaymentStatus(applicationId, candidate.id);
    return response.success(200, { data: payments });
  }

  // ── GET /payment/fee-structure ────────────────────────────────

  async getFeeStructure(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const fees = paymentService.getFeeStructure();
    return response.success(200, { data: { fees, currency: 'INR' } });
  }

  // ── GET /payment/{paymentOrderId}/invoice ─────────────────────

  async getInvoice(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const user = await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const paymentOrderId = pathParameters.paymentOrderId;
    if (!paymentOrderId) throw new AppError('Payment order ID is required', 400);

    const invoice = await paymentService.getInvoice(paymentOrderId);
    return response.success(200, { data: invoice });
  }

  // ── GET /payment/free/return ─────────────────────────────────

  async freeReturn(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { queryStringParameters } = parseEvent(event);
    const paymentOrderId = queryStringParameters?.paymentOrderId;

    if (!paymentOrderId) throw new AppError('Payment order ID is required', 400);

    const baseUrl = process.env.FRONTEND_URL || 'https://d3lnk974uo6n00.cloudfront.net';
    const frontendUrl = `${baseUrl}/application?txn=${paymentOrderId}`;

    try {
      await paymentService.completeFreePayment(paymentOrderId);
    } catch (err) {
      console.error('Error completing free payment:', err);
    }

    return response.redirect(frontendUrl, event);
  }
}

export const paymentController = new PaymentController();
export default paymentController;
