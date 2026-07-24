import crypto from 'crypto';
import { gatewayPaymentRepository } from '../repositories/gatewayPayment.repository';
// import { GetepayAdapter } from './getepay.adapter';
import { SbiAdapter } from './sbi.adapter';
import { AppError, NotFoundError } from '../errors/AppError';
import { generateUUID } from '../utils/crypto';
import config from '../config';

export interface CreatePaymentInput {
  candidate_id: string;
  exam_id: number;
  amount: number;
  currency: string;
}

export interface VerifyPaymentInput {
  transaction_id: string;
  gatewayResponse?: any;
  // Specific fields for Razorpay
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  // Specific fields for Easebuzz
  easebuzz_status?: string;
  easebuzz_hash?: string;
  // Specific fields for Getepay
  getepay_payment_id?: string;
}

export class GatewayPaymentService {
  async createPayment(input: CreatePaymentInput) {
    // 1. Detect active gateway or mode
    const paymentMode = process.env.PAYMENT_MODE;
    const activeGatewayEnv = process.env.ACTIVE_PAYMENT_GATEWAY;

    let gatewayName = activeGatewayEnv || 'getepay';
    let gatewayId = null;

    const activeGateway = await gatewayPaymentRepository.findActiveGateway(activeGatewayEnv);
    if (!activeGateway) {
      throw new AppError(`No active configuration found for gateway: ${activeGatewayEnv}`, 500);
    }
    gatewayName = activeGateway.gatewayName;
    gatewayId = activeGateway.id;

    // 2. Create transaction record
    const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const transaction = await gatewayPaymentRepository.createTransaction({
      transactionId,
      candidateId: input.candidate_id,
      examId: input.exam_id,
      gatewayId,
      amount: input.amount.toString(),
      currency: input.currency,
      paymentStatus: gatewayName === 'sbi' ? 'INITIATED' : 'pending',
    });

    // 3. Log request
    await gatewayPaymentRepository.createLog({
      transactionId,
      gatewayName,
      eventType: 'payment_initiate',
      requestPayload: input as unknown as Record<string, unknown>,
    });

    // 4. Gateway Implementation


    if (gatewayName === 'sbi') {
      const order = SbiAdapter.createOrder(input.amount, `rcpt_${transactionId}`);
      const htmlForm = `<!DOCTYPE html>
<html>
<head>
    <title>Redirecting to SBI...</title>
</head>
<body>
    <form id="sbiForm" method="POST" action="${order.paymentUrl}">
        <input type="hidden" name="EncryptTrans" value="${order.encData}" />
        <input type="hidden" name="merchIdVal" value="${order.merchantId}" />
    </form>
    <script type="text/javascript">
        document.getElementById('sbiForm').submit();
    </script>
</body>
</html>`;

      return {
        success: true,
        transactionId,
        gatewayOrderId: `sbi_${transactionId}`,
        amount: input.amount,
        currency: input.currency,
        paymentUrl: order.paymentUrl,
        encData: order.encData,
        merchIdVal: order.merchantId,
        sbiPayment: true,
        htmlForm,
      };
    }

    // if (gatewayName === 'getepay') {
    //   // Getepay specific logic
    //   const order = await GetepayAdapter.createOrder(input.amount, `rcpt_${transactionId}`, {
    //     email: 'test@gmail.com',
    //     phone: '1234567890',
    //     name: 'Candidate'
    //   });
    //   return {
    //     success: true,
    //     transactionId,
    //     gatewayOrderId: order.paymentId || order.getepayTxnId,
    //     amount: input.amount,
    //     currency: input.currency,
    //     paymentUrl: order.paymentUrl,
    //   };
    // }

    // if (gatewayName === 'easebuzz') {
    //   // Easebuzz specific logic
    //   const accessKey = process.env.EASEBUZZ_KEY || 'easebuzz_dummy_access_key';
    //   return {
    //     success: true,
    //     transactionId,
    //     accessKey,
    //     paymentUrl: `https://pay.easebuzz.in/pay/${accessKey}`,
    //   };
    // }

    throw new AppError('Unsupported payment gateway', 400);
  }

  async verifyPayment(input: VerifyPaymentInput) {
    const { transaction_id } = input;
    const transaction = await gatewayPaymentRepository.findTransactionById(transaction_id);

    if (!transaction) throw new NotFoundError('Transaction not found');
    if (transaction.paymentStatus === 'completed') {
      return { success: true, message: 'Payment already completed', status: 'completed' };
    }

    // Log response
    await gatewayPaymentRepository.createLog({
      transactionId: transaction_id,
      eventType: 'payment_verify',
      responsePayload: input.gatewayResponse,
    });

    let status = 'FAILED';

    // Dynamic verification based on gateway
    const gatewayName = process.env.ACTIVE_PAYMENT_GATEWAY || 'getepay';

    if (gatewayName === 'sbi') {
      const sbiStatus = input.gatewayResponse?.status || input.gatewayResponse?.rawFields?.[2];
      if (sbiStatus === 'SUCCESS' || sbiStatus === 'completed') {
        status = 'SUCCESS';
      } else if (sbiStatus === 'PENDING' || sbiStatus === 'pending') {
        status = 'PENDING';
      } else if (sbiStatus === 'FAIL' || sbiStatus === 'failed' || sbiStatus === 'FAILED') {
        status = 'FAILED';
      } else {
        const orderId = input.getepay_payment_id || transaction.transactionId;
        try {
          const sbiRes = await SbiAdapter.verifyPayment(orderId, parseFloat(transaction.amount));
          if (sbiRes.status === 'SUCCESS' || config.MOCK_PAYMENT) {
            status = 'SUCCESS';
          } else if (sbiRes.status === 'PENDING') {
            status = 'PENDING';
          } else {
            status = 'FAILED';
          }
        } catch (err) {
          console.error('SBI Verification Error:', err);
          status = 'FAILED';
        }
      }
    }

    // if (gatewayName === 'getepay' && input.getepay_payment_id) {
    //   try {
    //     const getepayRes = await GetepayAdapter.verifyPayment(input.getepay_payment_id);
    //     if (getepayRes.txnStatus === 'SUCCESS' || getepayRes.paymentStatus === 'SUCCESS' || config.MOCK_PAYMENT) {
    //       status = 'completed';
    //     }
    //   } catch (err) {
    //     console.error('Getepay Verification Error:', err);
    //   }
    // } else if (gatewayName === 'easebuzz' && input.easebuzz_status === 'success') {
    //   // Implement Easebuzz hash verification
    //   status = 'completed';
    // }

    await gatewayPaymentRepository.updateTransactionStatus(
      transaction_id,
      status,
      input.gatewayResponse
    );

    return {
      success: status === 'completed' || status === 'SUCCESS',
      message: `Payment ${status}`,
      status,
      transactionId: transaction_id,
    };
  }

  async getStatus(transactionId: string) {
    const transaction = await gatewayPaymentRepository.findTransactionById(transactionId);
    if (!transaction) throw new NotFoundError('Transaction not found');

    return {
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.paymentStatus,
    };
  }

  async processWebhook(gateway: string, payload: any, signature?: string) {
    // Basic idempotent implementation
    // Log webhook payload
    const transactionId = payload?.transaction_id || `TXN_WH_${Date.now()}`;
    await gatewayPaymentRepository.createLog({
      transactionId,
      gatewayName: gateway,
      eventType: 'webhook',
      requestPayload: payload,
    });

    return { success: true, message: 'Webhook processed' };
  }

  async refundPayment(transactionId: string) {
    const transaction = await gatewayPaymentRepository.findTransactionById(transactionId);
    if (!transaction) throw new NotFoundError('Transaction not found');

    const refundId = `REF_${Date.now()}`;
    await gatewayPaymentRepository.createRefund({
      transactionId,
      refundId,
      amount: transaction.amount,
      refundStatus: 'pending',
    });

    return { success: true, message: 'Refund initiated', refundId };
  }
}

export const gatewayPaymentService = new GatewayPaymentService();
