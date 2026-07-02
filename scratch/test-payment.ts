import { paymentService } from '../src/services/payment.service';
import { getDb, closeDb } from '../src/database/drizzle';
import { applications, payments, users, candidates } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = getDb();
  console.log('Connecting to database...');

  try {
    // 1. Find a candidate in the database to use for the test
    const candRows = await db
      .select({
        candidateId: candidates.id,
        applicationId: applications.id,
        email: users.email,
        mobileNumber: candidates.mobileNumber,
      })
      .from(candidates)
      .innerJoin(users, eq(candidates.userId, users.id))
      .leftJoin(applications, eq(applications.candidateId, candidates.id))
      .where(eq(applications.isSubmitted, true))
      .limit(1);

    if (candRows.length === 0 || !candRows[0].applicationId) {
      throw new Error('No candidate with application found. Please run the seed dummy candidate script first.');
    }

    const candidateId = candRows[0].candidateId as string;
    const applicationId = candRows[0].applicationId as string;
    console.log(`Using Candidate: ${candidateId}, Application: ${applicationId}`);

    // Clean up any existing completed payments for this application to avoid conflict
    await db
      .update(payments)
      .set({ status: 'failed' })
      .where(eq(payments.applicationId, applicationId));

    // 2. Initiate Payment
    console.log('\n--- STEP 1: Initiating Payment ---');
    const initiateResult = await paymentService.initiatePayment({
      applicationId,
      candidateId,
      paymentMode: 'online_upi',
      feeCategory: 'general',
    });

    console.log('Initiated successfully:');
    console.log(`Payment Order ID: ${initiateResult.paymentOrderId}`);
    console.log(`Amount (paise): ${initiateResult.amount}`);
    console.log(`Key: ${initiateResult.key}`);

    // 3. Simulate Razorpay payment signature generation
    console.log('\n--- STEP 2: Simulating Razorpay Signature Generation ---');
    const paymentId = `pay_${Math.random().toString(36).substring(2, 11)}`;
    const secret = process.env.RAZORPAY_SECRET || '';
    const text = initiateResult.paymentOrderId + '|' + paymentId;
    const generatedSignature = crypto.createHmac('sha256', secret).update(text).digest('hex');

    console.log(`Generated Payment ID: ${paymentId}`);
    console.log(`Using Secret: ${secret.substring(0, 4)}...`);
    console.log(`Signature: ${generatedSignature}`);

    // 4. Verify Payment (temporarily force MOCK_PAYMENT=false to test signature verification)
    console.log('\n--- STEP 3: Verifying Payment ---');
    process.env.MOCK_PAYMENT = 'false'; // Force real signature checking
    
    const verifyResult = await paymentService.verifyPayment({
      razorpayOrderId: initiateResult.paymentOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: generatedSignature,
    });

    console.log('Verification response:');
    console.log(JSON.stringify(verifyResult, null, 2));

    if (verifyResult.paymentStatus === 'completed') {
      console.log('\n==================================================');
      console.log('SUCCESS: Payment integration verified successfully!');
      console.log(`Transaction ID: ${verifyResult.transactionId}`);
      console.log('==================================================\n');
    } else {
      console.log('\n❌ Verification failed.');
    }

  } catch (error) {
    console.error('Error during payment integration test:', error);
  } finally {
    await closeDb();
  }
}

main();
