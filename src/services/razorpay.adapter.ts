import crypto from 'crypto';
import config from '../config';
import Razorpay from 'razorpay';
import { AppError } from '../errors/AppError';

export class RazorpayAdapter {
  private static getClient() {
    const key_id = process.env.RAZORPAY_KEY_ID || config.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_SECRET || config.RAZORPAY_SECRET;

    if (!key_id || !key_secret) {
      throw new AppError('Razorpay credentials are not configured properly', 500);
    }

    return new Razorpay({ key_id, key_secret });
  }

  static async createOrder(amount: number, currency: string, receipt: string) {
    const razorpay = this.getClient();
    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency,
      receipt,
    };
    return razorpay.orders.create(options);
  }

  static verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_SECRET || config.RAZORPAY_SECRET;
    if (!secret) {
      throw new Error('RAZORPAY_SECRET is not defined in the environment variables');
    }
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(text).digest('hex');

    return expectedSignature === signature;
  }
}
