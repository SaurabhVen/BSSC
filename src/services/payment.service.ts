import { paymentRepository, invoiceRepository } from '../repositories/common.repository';
import { applicationRepository } from '../repositories/application.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError, NotFoundError, ForbiddenError } from '../errors/AppError';
import { generateUUID } from '../utils/crypto';
import type { PaymentInitiateResult, PaymentVerifyResult } from '../types';
import type { Payment } from '../database/schema';
import config from '../config';
import crypto from 'crypto';
import { getDb } from '../database/drizzle';
import { applicationStepData, categories } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { GetepayAdapter } from './getepay.adapter';
import { sendPaymentSuccessSms } from '../utils/sms';
import { sendPaymentSuccessEmail } from '../utils/email';

const FEE_AMOUNTS: Record<string, number> = {
  /* Original JSSC Fee Amounts:
  general: 100,
  obc: 100,
  sc_st: 50,
  pwd: 0,
  */
  general: config.FEE_UR_EBC_BC_MALE,
  obc: config.FEE_UR_EBC_BC_MALE,
  sc_st: config.FEE_SC_ST_BIHAR,
  pwd: config.FEE_PWD_BIHAR,
  women: config.FEE_WOMEN_BIHAR,
  outside_bihar: config.FEE_OUTSIDE_BIHAR,
};

export interface InitiatePaymentInput {
  applicationId: string;
  candidateId: string;
  paymentMode: string;
  feeCategory: string;
}

export interface VerifyPaymentInput {
  paymentOrderId?: string;
  transactionId?: string;
  paymentStatus?: string;
  paymentMode?: string;
  bankName?: string;
  amount?: number;

  // Razorpay
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;

  // Getepay
  getepayPaymentId?: string;
  gatewayResponse?: any;
  payJson?: string;
}

export class PaymentService {
  // ── Initiate Payment ──────────────────────────────────────────

  async initiatePayment(input: InitiatePaymentInput): Promise<PaymentInitiateResult> {
    const application = await applicationRepository.findById(input.applicationId);

    if (!application) throw new NotFoundError('Application not found');
    if (application.candidateId !== input.candidateId) {
      throw new ForbiddenError('Application does not belong to this candidate');
    }

    const candidate = await userRepository.findCandidateById(input.candidateId);
    if (!candidate) throw new NotFoundError('Candidate profile not found');
    const userRecord = await userRepository.findById(candidate.userId);
    if (!userRecord) throw new NotFoundError('User profile not found');

    const existingPayments = await paymentRepository.findByApplicationId(input.applicationId);

    // Double check if any pending payments succeeded at the gateway
    for (const payment of existingPayments) {
      if (payment.status === 'pending' && payment.paymentOrderId) {
        try {
          const gateway = process.env.PAYMENT_GATEWAY || 'getepay';
          if (gateway === 'getepay') {
            const getepayRes = await GetepayAdapter.verifyPayment(payment.paymentOrderId);
            if (getepayRes.txnStatus === 'SUCCESS' || getepayRes.paymentStatus === 'SUCCESS') {
              await this.verifyPayment({
                paymentOrderId: payment.paymentOrderId,
                getepayPaymentId: getepayRes.getepayTxnId || payment.paymentOrderId,
                transactionId: getepayRes.getepayTxnId || payment.paymentOrderId,
                gatewayResponse: getepayRes,
              });
              payment.status = 'completed';
            }
          }
        } catch (err) {
          console.error(`[Requery] Failed to check pending payment during initiation:`, err);
        }
      }
    }

    const completedPayment = existingPayments.find((p) => p.status === 'completed');
    if (completedPayment) {
      throw new AppError('Payment has already been completed for this application', 409);
    }

    // Securely calculate fee from step data
    /* Original JSSC Fee Calculation (Commented Out):
    const db = getDb();
    const step1Record = await db
      .select()
      .from(applicationStepData)
      .where(
        and(
          eq(applicationStepData.applicationId, input.applicationId),
          eq(applicationStepData.stepNumber, 1)
        )
      )
      .limit(1);

    let amount = 100; // Default standard fee
    if (step1Record.length > 0) {
      const step1Data =
        typeof step1Record[0].data === 'string'
          ? JSON.parse(step1Record[0].data)
          : step1Record[0].data;

      const isPwd =
        step1Data?.isPwd === true ||
        step1Data?.isPwd === 'true' ||
        step1Data?.isPwd === 'yes' ||
        step1Data?.isPwd === 'YES' ||
        step1Data?.isPwd === 1;
      const isExServiceman =
        step1Data?.isExServiceman === true ||
        step1Data?.isExServiceman === 'true' ||
        step1Data?.isExServiceman === 'yes' ||
        step1Data?.isExServiceman === 'YES' ||
        step1Data?.isExServiceman === 1;
      const isBiharDomicile =
        step1Data?.isBiharDomicile === true ||
        step1Data?.isBiharDomicile === 'true' ||
        step1Data?.isBiharDomicile === 'yes' ||
        step1Data?.isBiharDomicile === 'YES' ||
        step1Data?.isBiharDomicile === 1;

      let catValue = 'unreserved';
      if (step1Data?.mainCategory) {
        const catRecord = await db
          .select()
          .from(categories)
          .where(eq(categories.catId, step1Data.mainCategory))
          .limit(1);
        if (catRecord.length > 0) {
          catValue = catRecord[0].catValue || 'unreserved';
        }
      }

      const isScSt = [
        'sc',
        'st',
        'primitive',
        'asur',
        'birhor',
        'birjia',
        'korwa',
        'mal_pahariya',
        'pahariya',
        'sauria_pahariya',
        'savar',
        'other',
      ].includes((catValue || '').toLowerCase());

      if (isPwd && isBiharDomicile) {
        amount = 0;
      } else if (isBiharDomicile && isScSt) {
        amount = 50;
      } else {
        amount = 100;
      }
    }
    */
    const db = getDb();
    const stepRecords = await db
      .select()
      .from(applicationStepData)
      .where(eq(applicationStepData.applicationId, input.applicationId));

    const step0Record = stepRecords.find((r) => r.stepNumber === 0);
    const step1Record = stepRecords.find((r) => r.stepNumber === 1);

    let amount = config.FEE_UR_EBC_BC_MALE; // Default standard fee
    if (step1Record) {
      const step1Data =
        typeof step1Record.data === 'string'
          ? JSON.parse(step1Record.data)
          : step1Record.data;

      const isPwd =
        step1Data?.isPwd === true ||
        step1Data?.isPwd === 'true' ||
        step1Data?.isPwd === 'yes' ||
        step1Data?.isPwd === 'YES' ||
        step1Data?.isPwd === 1;

      const isBiharDomicile =
        step1Data?.isBiharDomicile === true ||
        step1Data?.isBiharDomicile === 'true' ||
        step1Data?.isBiharDomicile === 'yes' ||
        step1Data?.isBiharDomicile === 'YES' ||
        step1Data?.isBiharDomicile === 1;

      let catValue = 'unreserved';
      if (step1Data?.mainCategory) {
        const catRecord = await db
          .select()
          .from(categories)
          .where(eq(categories.catId, step1Data.mainCategory))
          .limit(1);
        if (catRecord.length > 0) {
          catValue = catRecord[0].catValue || 'unreserved';
        }
      }

      const isScSt = [
        'sc',
        'st',
        'primitive',
        'asur',
        'birhor',
        'birjia',
        'korwa',
        'mal_pahariya',
        'pahariya',
        'sauria_pahariya',
        'savar',
        'other',
      ].includes((catValue || '').toLowerCase());

      let gender = 'male';
      if (step0Record) {
        const step0Data =
          typeof step0Record.data === 'string'
            ? JSON.parse(step0Record.data)
            : step0Record.data;
        if (step0Data?.gender) {
          gender = step0Data.gender;
        }
      }

      if (!isBiharDomicile) {
        amount = config.FEE_OUTSIDE_BIHAR;
      } else if (isPwd) {
        amount = config.FEE_PWD_BIHAR;
      } else if ((gender || '').toLowerCase() === 'female') {
        amount = config.FEE_WOMEN_BIHAR;
      } else if (isScSt) {
        amount = config.FEE_SC_ST_BIHAR;
      } else {
        amount = config.FEE_UR_EBC_BC_MALE;
      }
    }

    if (stepRecords) {
      const step0Record = stepRecords.find((r) => r.stepNumber === 0);
      const step1Record = stepRecords.find((r) => r.stepNumber === 1);
      if (step0Record) {
        const step0Data =
          typeof step0Record.data === 'string'
            ? JSON.parse(step0Record.data)
            : (step0Record.data as Record<string, any>);
        const step1Data = step1Record
          ? typeof step1Record.data === 'string'
            ? JSON.parse(step1Record.data)
            : (step1Record.data as Record<string, any>)
          : null;

        const oldRegNo = step1Data?.oldRegistrationNumber || step0Data?.oldRegistrationNumber || step0Data?.previousRegistrationNumber;
        const fatherName = step0Data?.fatherName;
        const motherName = step0Data?.motherName;
        if (oldRegNo && fatherName && motherName) {
          const regIdNum = parseInt(oldRegNo.toString().trim(), 10);

          if (!isNaN(regIdNum)) {
            // 1. Check if another candidate has already claimed/completed an application with this old registration number
            const { candidates } = await import('../database/schema');
            const { and: drAnd, ne } = await import('drizzle-orm');
            const duplicateCheck = await db
              .select()
              .from(candidates)
              .where(
                drAnd(
                  eq(candidates.oldRegistrationNumber, oldRegNo.toString().trim()),
                  ne(candidates.id, input.candidateId)
                )
              );
            if (duplicateCheck.length > 0) {
              throw new AppError('This old registration number has already been claimed by another applicant.', 400);
            }
            // 2. Lookup the paid status in the database
            const { paidCandidateRepository } = await import('../repositories/paidCandidate.repository');
            const paidRecord = await paidCandidateRepository.findByDetails(
              regIdNum,
              fatherName,
              motherName
            );
            if (paidRecord) {
              console.log(`[Payment] Verified pre-paid candidate with Old RegId: ${regIdNum}. Bypassing payment.`);
              amount = 0; // Set fee to 0, which triggers the system's built-in free/exempt payment flow
            }
          }
        }
      }
    }


    // Create actual Razorpay Order if fee > 0
    let paymentOrderId = `order_${generateUUID().substring(0, 14).toUpperCase()}`;
    let paymentUrl = '';

    if (amount > 0 && !config.MOCK_PAYMENT) {
      try {
        const rcptId = `rcpt_${input.applicationId.substring(0, 20).replace(/-/g, '')}_${Date.now()}`;
        const gateway = process.env.PAYMENT_GATEWAY || 'getepay';

        if (gateway === 'getepay') {
          const order = await GetepayAdapter.createOrder(amount, rcptId, {
            email: userRecord.email,
            phone: candidate.mobileNumber || '',
            name: userRecord.fullName
          });
          paymentOrderId = order.paymentId || order.getepayTxnId || `getepay_${generateUUID().substring(0, 8)}`;
          paymentUrl = order.paymentUrl || '';
        } else {
          throw new AppError('Payment gateway is not configured', 500);
        }
      } catch (err: any) {
        console.error('Error reaching Payment Gateway:', err);
        throw new AppError(`Payment gateway unavailable: ${err.message}`, 502);
      }
    } else if (amount === 0) {
      paymentOrderId = `free_${generateUUID().substring(0, 14).toUpperCase()}`;
      const baseUrl = process.env.GETEPAY_RETURN_URL || 'http://localhost:3000/dev';
      paymentUrl = `${baseUrl}/api/v1/payment/free/return?paymentOrderId=${paymentOrderId}`;
    }

    if (config.MOCK_PAYMENT) {
      paymentUrl = `https://mock-payment.local/pay?orderId=${paymentOrderId}&amount=${amount}`;
    }

    await paymentRepository.create({
      applicationId: input.applicationId,
      paymentOrderId,
      amount: amount.toString(),
      currency: 'INR',
      status: 'pending',
      paymentUrl,
    });




    // If amount is 0 (e.g. PwD), auto-complete
    if (amount === 0) {


      // await applicationRepository.updateStatus(input.applicationId, 'payment_completed');

      // const appRecord = await applicationRepository.findById(input.applicationId);
      // if (appRecord) {
      //   const completedSteps = Array.from(new Set([...appRecord.completedSteps, 2]));
      //   await applicationRepository.updateCurrentStep(
      //     appRecord.id,
      //     Math.max(appRecord.currentStep, 3),
      //     completedSteps
      //   );

      //   // Save the step 2 data for frontend consistency
      //   await applicationRepository.upsertStepData(input.applicationId, 2, {
      //     paymentOrderId,
      //     amount: 0,
      //     paymentStatus: 'completed',
      //     paymentMode: 'exempt',
      //     feeCategory: input.feeCategory,
      //   });
      // }


    }

    return {
      paymentOrderId,
      amount: amount,
      currency: 'INR',
      name: 'BSSC Candidate Portal',
      description: 'Application Registration Fee',
      prefill: {
        name: userRecord.fullName,
        email: userRecord.email,
        contact: candidate.mobileNumber || '',
      },
      paymentUrl,
      paymentStatus: 'pending',
      isFree: amount === 0,
    };
  }

  // ── Complete Free Payment ──────────────────────────────────────

  async completeFreePayment(paymentOrderId: string): Promise<void> {
    const payment = await paymentRepository.findByOrderId(paymentOrderId);
    if (!payment) throw new NotFoundError('Payment order not found');

    if (parseFloat(payment.amount) !== 0) {
      throw new AppError('This payment is not a free application payment', 400);
    }

    await paymentRepository.updateStatus(payment.id, {
      status: 'completed',
      paymentMode: 'exempt',
      bankName: 'N/A',
      transactionId: paymentOrderId,
    });

    await applicationRepository.updateStatus(payment.applicationId, 'payment_completed');

    const appRecord = await applicationRepository.findById(payment.applicationId);
    if (appRecord) {
      const completedSteps = Array.from(new Set([...appRecord.completedSteps, 2]));
      await applicationRepository.updateCurrentStep(
        appRecord.id,
        Math.max(appRecord.currentStep, 3),
        completedSteps
      );

      // Save the step 2 data
      await applicationRepository.upsertStepData(payment.applicationId, 2, {
        paymentOrderId,
        amount: 0,
        paymentStatus: 'completed',
        paymentMode: 'exempt',
        feeCategory: 'exempt',
      });
    }
  }

  // ── Verify Payment ────────────────────────────────────────────

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerifyResult> {
    const orderId = input.getepayPaymentId || input.paymentOrderId;
    if (!orderId) throw new AppError('Payment order ID is required', 400);
    let payment = await paymentRepository.findByOrderId(orderId);

    // Fallback: Getepay webhook returns getepayTxnId which differs from the generated paymentId.
    // If orderId lookup fails, use the original rcpt_... passed as paymentOrderId to find it via applicationId.
    if (!payment && input.paymentOrderId && input.paymentOrderId.startsWith('rcpt_')) {
      payment = await paymentRepository.findByRcptId(input.paymentOrderId);

    }

    if (!payment) throw new NotFoundError('Payment order not found');


    if (payment.status === 'completed') {

      return {
        paymentStatus: 'completed',
        transactionId:
          payment.transactionId ?? (input.razorpayPaymentId || input.transactionId || ''),
        paidAmount: parseFloat(payment.amount),
      };
    }
    console.log(payment, 'awanish');

    let transactionId = input.transactionId || '';
    let paymentMode = input.paymentMode || 'online';
    let bankName = input.bankName || 'Unknown Bank';

    const gateway = process.env.PAYMENT_GATEWAY || 'getepay';

    let isSuccess = true;
    let failureReason = '';
    let apiResponse = input.gatewayResponse || (input as unknown as Record<string, unknown>);

    if (gateway === 'getepay') {
      if (input.gatewayResponse && (input.gatewayResponse.txnStatus === 'SUCCESS' || input.gatewayResponse.paymentStatus === 'SUCCESS')) {
        transactionId = input.gatewayResponse.getepayTxnId || input.getepayPaymentId || orderId;
        paymentMode = input.gatewayResponse.paymentMode || 'getepay';
        bankName = 'Getepay Gateway';
      } else {
        const pId = input.getepayPaymentId || input.paymentOrderId || orderId;
        try {
          const getepayRes = await GetepayAdapter.verifyPayment(pId);
          apiResponse = getepayRes;
          if (getepayRes.txnStatus !== 'SUCCESS' && getepayRes.paymentStatus !== 'SUCCESS') {
            if (!config.MOCK_PAYMENT) {
              isSuccess = false;
              failureReason = `Getepay payment not successful: ${getepayRes.txnStatus || getepayRes.paymentStatus}`;
            }
          }
          transactionId = getepayRes.getepayTxnId || pId;
          paymentMode = 'getepay';
          bankName = 'Getepay Gateway';
        } catch (err: any) {
          if (!config.MOCK_PAYMENT) {
            isSuccess = false;
            failureReason = `Getepay verification failed: ${err.message}`;
            if (err.response?.data) {
              apiResponse = err.response.data;
            }
          }
        }
      }
    } else {
      transactionId = input.transactionId || `TXN${Date.now()}`;
    }

    if (!isSuccess) {
      await paymentRepository.updateStatus(payment.id, {
        status: 'failed',
        transactionId,
        paymentMode,
        bankName,
        gatewayResponse: apiResponse,
        payJson: input.payJson,
      });

      // Update step data
      await applicationRepository.upsertStepData(payment.applicationId, 2, {
        paymentOrderId: payment.paymentOrderId,
        transactionId,
        amount: parseFloat(payment.amount),
        paymentStatus: 'failed',
        paymentMode,
        bankName,
        paymentDate: new Date().toISOString(),
      });

      throw new AppError(failureReason, 400);
    }

    const status = 'completed';

    const updatedPayment = await paymentRepository.updateStatus(payment.id, {
      status,
      transactionId,
      paymentMode,
      bankName,
      gatewayResponse: apiResponse,
      payJson: input.payJson,
    });

    await applicationRepository.updateStatus(payment.applicationId, 'payment_completed');

    // Create Invoice record
    const appRecord = await applicationRepository.findById(payment.applicationId);

    if (appRecord) {
      const completedSteps = Array.from(new Set([...appRecord.completedSteps, 2]));
      await applicationRepository.updateCurrentStep(
        appRecord.id,
        Math.max(appRecord.currentStep, 3),
        completedSteps
      );

      await applicationRepository.upsertStepData(payment.applicationId, 2, {
        paymentOrderId: payment.paymentOrderId,
        transactionId: updatedPayment.transactionId,
        amount: parseFloat(payment.amount),
        paymentStatus: 'completed',
        paymentMode: updatedPayment.paymentMode,
        bankName: updatedPayment.bankName,
      });
    }

    let candidateName = 'Candidate';
    let email = '';
    let mobileNumber = '';
    const applicationReference = appRecord?.applicationReferenceNumber || appRecord?.id || '';

    if (appRecord) {
      const cand = await userRepository.findCandidateById(appRecord.candidateId);
      if (cand) {
        mobileNumber = cand.mobileNumber || '';
        const usr = await userRepository.findById(cand.userId);
        if (usr) {
          candidateName = usr.fullName;
          email = usr.email;
        }
      }
    }

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceDetails = {
      candidateName,
      email,
      mobileNumber,
      applicationReference,
      amount: parseFloat(payment.amount),
      totalAmount: parseFloat(payment.amount),
      paymentMode,
      transactionId,
      paymentDate: new Date().toISOString(),
      paymentOrderId: orderId,
    };

    await invoiceRepository.create({
      paymentId: payment.id,
      invoiceNumber,
      issueDate: new Date(),
      status: 'paid',
      details: invoiceDetails,
    });

    // Send Successful Payment Notifications
    try {
      const examName = 'BSSC Examination'; // This could be fetched dynamically if exam schema exists
      if (mobileNumber) {
        await sendPaymentSuccessSms(mobileNumber, examName, payment.amount, applicationReference);
      }
      if (email) {
        await sendPaymentSuccessEmail(
          email,
          candidateName,
          examName,
          applicationReference,
          transactionId,
          payment.amount
        );
      }
    } catch (notificationError) {
      console.error(
        '[PAYMENT] Non-fatal: Failed to send payment success notifications',
        notificationError
      );
    }

    return {
      paymentStatus: updatedPayment.status,
      transactionId: updatedPayment.transactionId ?? transactionId,
      paidAmount: parseFloat(updatedPayment.amount),
    };
  }

  // ── Get Payment Status ────────────────────────────────────────

  async getPaymentStatus(applicationId: string, candidateId: string): Promise<Payment[]> {
    const application = await applicationRepository.findById(applicationId);
    if (!application) throw new NotFoundError('Application not found');
    if (application.candidateId !== candidateId) {
      throw new ForbiddenError('Application does not belong to this candidate');
    }
    const payments = await paymentRepository.findByApplicationId(applicationId);

    // Double check if any pending payments succeeded at the gateway
    for (const payment of payments) {
      if (payment.status === 'pending' && payment.paymentOrderId) {
        try {
          const gateway = process.env.PAYMENT_GATEWAY || 'getepay';
          if (gateway === 'getepay') {
            console.log(`[Requery] Querying Getepay status for pending payment order ID: ${payment.paymentOrderId}`);
            const getepayRes = await GetepayAdapter.verifyPayment(payment.paymentOrderId);
            if (getepayRes.txnStatus === 'SUCCESS' || getepayRes.paymentStatus === 'SUCCESS') {
              console.log(`[Requery] Payment verified as SUCCESS. Updating database record...`);
              await this.verifyPayment({
                paymentOrderId: payment.paymentOrderId,
                getepayPaymentId: getepayRes.getepayTxnId || payment.paymentOrderId,
                transactionId: getepayRes.getepayTxnId || payment.paymentOrderId,
                gatewayResponse: getepayRes,
              });
              payment.status = 'completed';
              payment.transactionId = getepayRes.getepayTxnId || payment.paymentOrderId;
            }
          }
        } catch (err) {
          console.error(`[Requery] Failed to verify payment for ${payment.paymentOrderId}:`, err);
        }
      }
    }

    return payments;
  }

  getFeeStructure(): Record<string, number> {
    // Original implementation:
    // return { ...FEE_AMOUNTS };
    return {
      general: config.FEE_UR_EBC_BC_MALE,
      obc: config.FEE_UR_EBC_BC_MALE,
      sc_st: config.FEE_SC_ST_BIHAR,
      pwd: config.FEE_PWD_BIHAR,
      women: config.FEE_WOMEN_BIHAR,
      outside_bihar: config.FEE_OUTSIDE_BIHAR,
    };
  }

  // ── Get Invoice ───────────────────────────────────────────────

  async getInvoice(paymentOrderId: string) {
    const payment = await paymentRepository.findByOrderId(paymentOrderId);
    if (!payment) throw new NotFoundError('Payment order not found');

    const invoice = await invoiceRepository.findByPaymentId(payment.id);
    if (!invoice) throw new NotFoundError('Invoice not found for this payment');

    // Generate a premium HTML printable structure
    const details = invoice.details as Record<string, any>;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; background-color: #f9f9f9; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border-top: 6px solid #1a73e8; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f1f1; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; color: #1a73e8; font-size: 28px; }
    .header .meta { text-align: right; }
    .meta div { margin-bottom: 5px; font-size: 14px; color: #666; }
    .section-title { font-size: 16px; font-weight: bold; color: #1a73e8; border-bottom: 1px solid #e8f0fe; padding-bottom: 5px; margin-bottom: 15px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .col div { margin-bottom: 8px; font-size: 14px; }
    .col span { font-weight: bold; color: #555; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background: #f8f9fa; text-align: left; padding: 12px; font-size: 14px; font-weight: bold; border-bottom: 2px solid #dee2e6; }
    .table td { padding: 12px; font-size: 14px; border-bottom: 1px solid #dee2e6; }
    .total-row { text-align: right; font-size: 16px; font-weight: bold; padding-top: 20px; }
    .footer { text-align: center; font-size: 12px; color: #999; border-top: 1px solid #f1f1f1; padding-top: 20px; margin-top: 40px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background-color: #e6f4ea; color: #137333; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <h1>BSSC</h1>
        <div>Jharkhand Staff Selection Commission</div>
      </div>
      <div class="meta">
        <div style="font-size: 20px; font-weight: bold; color: #333; margin-bottom: 10px;">INVOICE</div>
        <div><span>Invoice No:</span> ${invoice.invoiceNumber}</div>
        <div><span>Date:</span> ${new Date(invoice.issueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div><span class="badge">${invoice.status}</span></div>
      </div>
    </div>

    <div class="grid">
      <div class="col">
        <div class="section-title">Billed To</div>
        <div><span>Name:</span> ${details.candidateName}</div>
        <div><span>Email:</span> ${details.email}</div>
        <div><span>Contact:</span> ${details.mobileNumber}</div>
      </div>
      <div class="col">
        <div class="section-title">Payment Information</div>
        <div><span>Order ID:</span> ${details.paymentOrderId}</div>
        <div><span>Transaction ID:</span> ${details.transactionId}</div>
        <div><span>Mode:</span> ${details.paymentMode}</div>
        <div><span>Date/Time:</span> ${new Date(details.paymentDate).toLocaleString('en-IN')}</div>
      </div>
    </div>

    <div class="section-title">Applied Application Details</div>
    <div style="font-size: 14px; margin-bottom: 30px;">
      <div><span>Application Reference:</span> ${details.applicationReference}</div>
    </div>

    <div class="section-title">Fee Summary</div>
    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Application Registration Fee</td>
          <td style="text-align: right;">INR ${details.amount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Total Amount Paid</td>
          <td style="text-align: right; font-weight: bold; color: #1a73e8;">INR ${details.totalAmount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      This is a system generated document and does not require a physical signature.
    </div>
  </div>
</body>
</html>
    `;

    return {
      ...invoice,
      html,
    };
  }
}

export const paymentService = new PaymentService();
export default paymentService;
