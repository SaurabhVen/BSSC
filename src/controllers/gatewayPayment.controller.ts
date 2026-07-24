import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import querystring from 'querystring';
import CryptoJS from 'crypto-js';
import config from '../config';
// import { GetepayAdapter } from '../services/getepay.adapter';
import { SbiAdapter } from '../services/sbi.adapter';
import { gatewayPaymentService } from '../services/gatewayPayment.service';
import { paymentService } from '../services/payment.service';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  createPaymentSchema,
  verifyPaymentSchema,
  refundPaymentSchema,
} from '../validators/gatewayPayment';
import { AppError } from '../errors/AppError';
import type { LambdaResponse } from '../types';

export class GatewayPaymentController {
  async create(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    await authenticate(event); // Requires auth
    const { body } = parseEvent(event);
    const input = validate(createPaymentSchema, body);

    const result = await gatewayPaymentService.createPayment({
      ...input,
      currency: input.currency ?? 'INR',
    });

    return response.created({
      message: 'Payment created successfully.',
      data: result,
    });
  }

  async verify(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    await authenticate(event);
    const { body } = parseEvent(event);
    const input = validate(verifyPaymentSchema, body);

    const result = await gatewayPaymentService.verifyPayment(input);

    return response.success(200, {
      message: result.message,
      data: result,
    });
  }

  async getStatus(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    await authenticate(event);
    const { pathParameters } = parseEvent(event);
    const transactionId = pathParameters?.transaction_id;
    if (!transactionId) throw new AppError('Transaction ID is required', 400);

    const result = await gatewayPaymentService.getStatus(transactionId);
    return response.success(200, { data: result });
  }

  async refund(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    await authenticate(event);
    // Requires RBAC logic here ideally for admin refunds
    const { body } = parseEvent(event);
    const input = validate(refundPaymentSchema, body);

    const result = await gatewayPaymentService.refundPayment(input.transaction_id);
    return response.success(200, { message: 'Refund initiated successfully', data: result });
  }

  async webhook(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { pathParameters, body, headers } = parseEvent(event);
    const gateway = pathParameters?.gateway;
    if (!gateway) throw new AppError('Gateway identifier is required', 400);

    let verificationResult: any = null;

    // if (gateway === 'getepay' && body && body.response) {
    //   try {
    //     const key = process.env.GETEPAY_KEY || config.GETEPAY_KEY || '';
    //     const iv = process.env.GETEPAY_IV || config.GETEPAY_IV || '';

    //     const keys = CryptoJS.enc.Base64.parse(key);
    //     const ivs = CryptoJS.enc.Base64.parse(iv);

    //     const decryptedStr = CryptoJS.AES.decrypt(body.response as string, keys, {
    //       iv: ivs,
    //       mode: CryptoJS.mode.CBC,
    //       padding: CryptoJS.pad.Pkcs7,
    //       format: CryptoJS.format.Hex,
    //     }).toString(CryptoJS.enc.Utf8);

    //     let decryptedRes: any;
    //     try {
    //       decryptedRes = JSON.parse(decryptedStr);
    //       if (typeof decryptedRes === 'string') {
    //         decryptedRes = JSON.parse(decryptedRes);
    //       }
    //     } catch (e) {
    //       console.error("Failed to parse decrypted webhook string", e);
    //       decryptedRes = {};
    //     }

    //     const transactionId = decryptedRes.merchantTransactionId || decryptedRes.merchantOrderNo;
    //     const paymentId = decryptedRes.paymentId || decryptedRes.getepayTxnId;
    //     if (transactionId) {
    //       console.log(`[Webhook] Decrypted Getepay txn: ${transactionId}, status: ${decryptedRes.txnStatus}`);
    //       verificationResult = await paymentService.verifyPayment({
    //         paymentOrderId: transactionId,
    //         getepayPaymentId: paymentId,
    //         transactionId: paymentId,
    //         gatewayResponse: decryptedRes,
    //       });
    //     }
    //   } catch (err) {
    //     console.error('Error processing Getepay webhook:', err);
    //   }
    // } 
    if (gateway === 'sbi' && body) {
      try {
        const encryptedText = body.pushRespData || body.encData;
        if (encryptedText) {
          const sbiKey = process.env.SBI_KEY || config.SBI_KEY || '';
          const decryptedStr = SbiAdapter.decrypt(encryptedText as string, sbiKey);
          const fields = decryptedStr.split('|');
          const transactionId = fields[0];
          const status = fields[2];
          const amount = fields[3];

          if (transactionId) {
            console.log(`[Webhook] Decrypted SBI txn: ${transactionId}, status: ${status}`);
            let paymentStatus = 'FAILED';
            if (status === 'SUCCESS') {
              paymentStatus = 'SUCCESS';
            } else if (status === 'PENDING') {
              paymentStatus = 'PENDING';
            }
            verificationResult = await paymentService.verifyPayment({
              paymentOrderId: transactionId,
              transactionId: fields[1] || fields[9] || transactionId,
              paymentStatus,
              paymentMode: fields[5] || 'sbi',
              amount: parseFloat(amount),
              gatewayResponse: { rawFields: fields }
            });
          }
        }
      } catch (err) {
        console.error('Error processing SBI webhook:', err);
      }
    }

    const signature = headers['x-razorpay-signature'] || headers['x-easebuzz-signature'] || '';

    // Log and process idempotently
    const result = await gatewayPaymentService.processWebhook(gateway, body, signature);

    return response.success(200, {
      message: 'Webhook processed successfully',
      data: {
        ...result,
        verification: verificationResult,
      }
    });
  }

  async returnRedirect(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const baseUrl = process.env.FRONTEND_URL || 'https://d3lnk974uo6n00.cloudfront.net';
    let frontendUrl = `${baseUrl}/application`;

    try {

      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64').toString('utf8')
        : event.body || '';

      // Parse application/x-www-form-urlencoded or JSON
      let parsedBody: any;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = querystring.parse(rawBody);
      }

      // if (parsedBody && parsedBody.response) {
      //   // Decrypt Getepay response
      //   const key = process.env.GETEPAY_KEY || config.GETEPAY_KEY || '';
      //   const iv = process.env.GETEPAY_IV || config.GETEPAY_IV || '';

      //   const keys = CryptoJS.enc.Base64.parse(key);
      //   const ivs = CryptoJS.enc.Base64.parse(iv);

      //   const decryptedStr = CryptoJS.AES.decrypt(parsedBody.response as string, keys, {
      //     iv: ivs,
      //     mode: CryptoJS.mode.CBC,
      //     padding: CryptoJS.pad.Pkcs7,
      //     format: CryptoJS.format.Hex,
      //   }).toString(CryptoJS.enc.Utf8);

      //   let decryptedRes: any;
      //   try {
      //     decryptedRes = JSON.parse(decryptedStr);
      //     if (typeof decryptedRes === 'string') {
      //       decryptedRes = JSON.parse(decryptedRes); // Handles double-stringified JSON payload
      //     }
      //   } catch (e) {
      //     console.error("Failed to parse decrypted string", e);
      //     decryptedRes = {};
      //   }


      //   const transactionId = decryptedRes.merchantTransactionId || decryptedRes.merchantOrderNo;
      //   const paymentId = decryptedRes.paymentId || decryptedRes.getepayTxnId;
      //   if (transactionId) {
      //     // Verify and update the DB right away
      //     try {
      //       await paymentService.verifyPayment({
      //         paymentOrderId: transactionId,
      //         getepayPaymentId: paymentId,
      //         transactionId: paymentId, // getepayTxnId
      //         gatewayResponse: decryptedRes, // save full json data
      //       });
      //     } catch (verifyErr) {
      //       console.error('Error verifying payment in return redirect:', verifyErr);
      //     }

      //     frontendUrl = `${baseUrl}/application?txn=${transactionId}`;
      //   }
      if (parsedBody && parsedBody.encData) {
        // Decrypt SBI response
        try {
          const sbiKey = process.env.SBI_KEY || config.SBI_KEY || '';
          const decryptedStr = SbiAdapter.decrypt(parsedBody.encData as string, sbiKey);
          const fields = decryptedStr.split('|');
          const transactionId = fields[0];
          const status = fields[2];
          const amount = fields[3];

          if (transactionId) {
            console.log(`[Redirect] Decrypted SBI txn: ${transactionId}, status: ${status}`);
            try {
              let paymentStatus = 'FAILED';
              if (status === 'SUCCESS') {
                paymentStatus = 'SUCCESS';
              } else if (status === 'PENDING') {
                paymentStatus = 'PENDING';
              }
              await paymentService.verifyPayment({
                paymentOrderId: transactionId,
                transactionId: fields[1] || fields[9] || transactionId,
                paymentStatus,
                paymentMode: fields[5] || 'sbi',
                amount: parseFloat(amount),
                gatewayResponse: { rawFields: fields }
              });
            } catch (verifyErr) {
              console.error('Error verifying SBI payment in return redirect:', verifyErr);
            }
            frontendUrl = `${baseUrl}/application?txn=${transactionId}`;
          }
        } catch (err) {
          console.error('Error processing SBI return payload:', err);
        }
      }
    } catch (err) {
      console.error('Error processing return payload:', err);
    }

    return response.redirect(frontendUrl, event);
  }
}

export const gatewayPaymentController = new GatewayPaymentController();
