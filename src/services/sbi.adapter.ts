import crypto from 'crypto';
import axios from 'axios';
import config from '../config';
import { AppError } from '../errors/AppError';

export class SbiAdapter {
  private static getCredentials() {
    const mid = process.env.SBI_MID || config.SBI_MID || '1000605';
    const key = process.env.SBI_KEY || config.SBI_KEY || 'pWhMnIEMc4q6hKdi2Fx50Ii8CKAoSIqv9ScSpwuMHM4=';
    const url = process.env.SBI_URL || config.SBI_URL || 'https://test.epay.sbiuat.bank.in/secure/AggregatorHostedListener';
    const requeryUrl = process.env.SBI_REQUERY_URL || config.SBI_REQUERY_URL || 'https://test.epay.sbiuat.bank.in/payagg/statusQuery/getStatusQuery';

    if (!mid || !key || !url) {
      throw new AppError('SBI credentials are not configured properly', 500);
    }

    return { mid, key, url, requeryUrl };
  }

  /**
   * Encrypts the raw string payload using AES-128-CBC matching the document's Node.js template
   */
  public static encrypt(input: string, key: string): string {
    const keySlice = key.slice(0, 16);
    const iv = key.slice(0, 16);
    const cipher = crypto.createCipheriv("aes-128-cbc", keySlice, iv);
    
    let encrypted = cipher.update(input, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  /**
   * Decrypts the cipher text received from SBI
   */
  public static decrypt(cipherText: string, key: string): string {
    const keySlice = key.slice(0, 16);
    const iv = key.slice(0, 16);
    const decipher = crypto.createDecipheriv("aes-128-cbc", keySlice, iv);
    
    let decrypted = decipher.update(cipherText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Initiates payment order and returns parameter structure or payment URL
   */
  public static createOrder(amount: number, transactionId: string) {
    const { mid, key, url } = this.getCredentials();
    const returnUrl = process.env.SBI_RETURN_URL || config.SBI_RETURN_URL;

    // fields according to SBIePay integration documents (Single Request format)
    const fields = [
      mid,
      'DOM',             // OperatingMode
      'IN',              // MerchantCountry
      'INR',             // MerchantCurrency
      amount.toFixed(2), // TotalDueAmount
      'NA',              // OtherDetails
      returnUrl,         // SuccessURL
      returnUrl,         // FailURL
      'SBIEPAY',         // AggregatorId
      transactionId,     // MerchantOrderNumber
      'NA',              // MerchantCustomerID
      'NB',              // Paymode (NB default for aggregator model)
      'ONLINE',          // AccessMedium
      'ONLINE'           // TransactionSource
    ];

    const rawString = fields.join('|');
    const encryptedData = this.encrypt(rawString, key);

    return {
      paymentUrl: url,
      encData: encryptedData,
      merchantId: mid,
    };
  }

  /**
   * Queries SBI API to verify a transaction's status
   */
  public static async verifyPayment(paymentOrderId: string, amount: number) {
    const { mid, key, requeryUrl } = this.getCredentials();

    // queryRequest = ATRN|Merchant ID|Merchant Order Number|Amount
    // Passing empty ATRN since we are querying using Merchant Order Number and Amount
    const queryRequest = `|${mid}|${paymentOrderId}|${amount.toFixed(2)}`;
    
    const params = new URLSearchParams();
    params.append('queryRequest', queryRequest);
    params.append('aggregatorId', 'SBIEPAY');
    params.append('merchantId', mid);

    try {
      const response = await axios.post(requeryUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      let responseText = response.data;
      if (typeof responseText === 'string') {
        responseText = responseText.trim();
        // If the response is wrapped in a parameter or is URL-encoded, extract the value
        if (responseText.includes('encStatusData=')) {
          const parsed = new URLSearchParams(responseText);
          responseText = parsed.get('encStatusData') || responseText;
        }
      }

      // Decrypt response status
      const decryptedRes = this.decrypt(responseText, key);
      const fields = decryptedRes.split('|');

      return {
        merchantId: fields[0],
        atrn: fields[1],
        status: fields[2], // 'SUCCESS', 'FAIL', 'PENDING'
        amount: fields[7] ? parseFloat(fields[7]) : amount,
        rawFields: fields,
      };
    } catch (error: any) {
      console.error('SBI verifyPayment Error:', error.message);
      throw error;
    }
  }
}
