import crypto from 'crypto';
import axios from 'axios';
import config from '../config';
import { AppError } from '../errors/AppError';

export class GetepayAdapter {
  private static getKeyAndIv() {
    const key = process.env.GETEPAY_KEY || config.GETEPAY_KEY || '';
    const iv = process.env.GETEPAY_IV || config.GETEPAY_IV || '';
    const mid = process.env.GETEPAY_MID || config.GETEPAY_MID || '';
    const terminalId = process.env.GETEPAY_TERMINAL_ID || config.GETEPAY_TERMINAL_ID || '';

    if (!key || !iv || !mid || !terminalId) {
      throw new AppError('Getepay credentials are not configured properly', 500);
    }

    return { key, iv, mid, terminalId };
  }

  private static getAlgorithm(keyBuf: Buffer) {
    if (keyBuf.length === 32) return 'aes-256-cbc';
    if (keyBuf.length === 24) return 'aes-192-cbc';
    if (keyBuf.length === 16) return 'aes-128-cbc';
    throw new Error(`Invalid Getepay key length: ${keyBuf.length}`);
  }

  public static encrypt(data: string, key: string, iv: string): string {
    const keyBuf = Buffer.from(key, 'base64');
    const ivBuf = Buffer.from(iv, 'base64');
    const algorithm = this.getAlgorithm(keyBuf);

    const cipher = crypto.createCipheriv(algorithm, keyBuf, ivBuf);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted.toUpperCase();
  }

  public static decrypt(data: string, key: string, iv: string): string {
    const keyBuf = Buffer.from(key, 'base64');
    const ivBuf = Buffer.from(iv, 'base64');
    const algorithm = this.getAlgorithm(keyBuf);

    const decipher = crypto.createDecipheriv(algorithm, keyBuf, ivBuf);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
<<<<<<< HEAD
=======
  private static getReturnUrl() {
    const configuredUrl = process.env.GETEPAY_RETURN_URL || config.GETEPAY_RETURN_URL || 'https://pay1.getepay.in:8443/getepayPortal/pg/generateInvoice';
    if (configuredUrl.includes('/api/v1/payment/gateway/return')) {
      return configuredUrl;
    }
    return configuredUrl.replace(/\/$/, '') + '/api/v1/payment/gateway/return';
  }

  private static getWebhookUrl() {
    const configuredUrl = process.env.GETEPAY_RETURN_URL || config.GETEPAY_RETURN_URL || 'http://localhost:3000/api/v1/payment/gateway/return';
    const base = configuredUrl.replace(/\/api\/v1\/payment\/gateway\/return$/, '').replace(/\/$/, '');
    return `${base}/api/v1/payment/webhook/getepay`;
  }
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74

  public static async createOrder(
    amount: number,
    transactionId: string,
    customerDetails: { email: string; phone: string; name: string }
  ) {
    const { key, iv, mid, terminalId } = this.getKeyAndIv();

<<<<<<< HEAD
    let returnUrl = process.env.GETEPAY_RETURN_URL || config.GETEPAY_RETURN_URL || "https://pay1.getepay.in:8443";
    if (!returnUrl.endsWith('/api/v1/payment/gateway/return')) {
      returnUrl = returnUrl.replace(/\/$/, '') + '/api/v1/payment/gateway/return';
    }
=======
    const returnUrl = this.getReturnUrl();
    const webhookUrl = this.getWebhookUrl();
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74

    const data = {
      mid: mid,
      amount: amount.toFixed(2),
      merchantTransactionId: transactionId,
      transactionDate: new Date().toUTCString(),
      terminalId: terminalId,
      udf1: customerDetails.phone || "1234567890",
      udf2: customerDetails.email || "test@gmail.com",
      udf3: customerDetails.name || "Test",
      udf4: "",
      udf5: "",
      udf6: "",
      udf7: "",
      udf8: "",
      udf9: "",
      udf10: "",
      ru: returnUrl,
<<<<<<< HEAD
      callbackUrl: "",
=======
      callbackUrl: webhookUrl,
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
      currency: "INR",
      paymentMode: "ALL",
      bankId: "",
      txnType: "single",
      productType: "IPG",
      txnNote: "BSSC Application Fee"
    };

    const reqStr = JSON.stringify(data);
    const encryptedReq = this.encrypt(reqStr, key, iv);

    const payload = {
      mid,
      terminalId,
      req: encryptedReq
    };

    const url = process.env.GETEPAY_URL || config.GETEPAY_URL || 'https://pay1.getepay.in:8443/getepayPortal/pg/generateInvoice';

    try {
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data && (response.data.res || response.data.response)) {
        const encryptedStr = response.data.response || response.data.res;
        const decryptedResStr = this.decrypt(encryptedStr, key, iv);
        const decryptedRes = JSON.parse(decryptedResStr);
        return decryptedRes;
      } else {
        throw new Error(`Getepay Error: ${response.data.message || 'Unknown Error'}`);
      }
    } catch (error: any) {
      console.error('Getepay createOrder Error:', error?.response?.data || error.message);
      throw error;
    }
  }

  public static async verifyPayment(paymentId: string) {
    const { key, iv, mid, terminalId } = this.getKeyAndIv();

    const data = {
      mid: mid,
      paymentId: paymentId,
      referenceNo: "",
      status: "",
      terminalId: terminalId
    };

    const reqStr = JSON.stringify(data);
    const encryptedReq = this.encrypt(reqStr, key, iv);

    const payload = {
      mid,
      terminalId,
      req: encryptedReq
    };

    const url = process.env.GETEPAY_REQUERY_URL || config.GETEPAY_REQUERY_URL || 'https://portal.getepay.in:8443/getepayPortal/pg/invoiceStatus';

    try {
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data && response.data.response) {
        const decryptedResStr = this.decrypt(response.data.response, key, iv);
        const decryptedRes = JSON.parse(decryptedResStr);
        return decryptedRes;
      } else {
        throw new Error(`Getepay Requery Error: ${response.data.message || 'Unknown Error'}`);
      }
    } catch (error: any) {
      console.error('Getepay verifyPayment Error:', error?.response?.data || error.message);
      throw error;
    }
  }
}
