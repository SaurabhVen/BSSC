import { eq, and } from 'drizzle-orm';
import { getDb } from '../database/drizzle';
import {
  paymentGateways,
  paymentTransactions,
  paymentLogs,
  paymentRefunds,
  type PaymentGateway,
  type NewPaymentGateway,
  type PaymentTransaction,
  type NewPaymentTransaction,
  type PaymentLog,
  type NewPaymentLog,
  type PaymentRefund,
  type NewPaymentRefund,
} from '../database/schema';
import { DatabaseError } from '../errors/AppError';

export class GatewayPaymentRepository {
  // Gateways
  async findActiveGateway(gatewayName?: string): Promise<PaymentGateway | null> {
    try {
      const db = getDb();
      const conditions = [eq(paymentGateways.isActive, true), eq(paymentGateways.isDeleted, false)];
      if (gatewayName) {
        conditions.push(eq(paymentGateways.gatewayName, gatewayName));
      }
      const result = await db
        .select()
        .from(paymentGateways)
        .where(and(...conditions))
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find active gateway', err as Error);
    }
  }

  // Transactions
  async createTransaction(data: NewPaymentTransaction): Promise<PaymentTransaction> {
    try {
      const db = getDb();
      const result = await db.insert(paymentTransactions).values(data).returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to create payment transaction', err as Error);
    }
  }

  async findTransactionById(transactionId: string): Promise<PaymentTransaction | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.transactionId, transactionId))
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find payment transaction', err as Error);
    }
  }

  async updateTransactionStatus(
    transactionId: string,
    status: string,
    gatewayResponse?: Record<string, unknown>
  ): Promise<PaymentTransaction> {
    try {
      const db = getDb();
      const updates: any = { paymentStatus: status, updatedAt: new Date() };
      if (gatewayResponse) updates.gatewayResponse = gatewayResponse;

      const result = await db
        .update(paymentTransactions)
        .set(updates)
        .where(eq(paymentTransactions.transactionId, transactionId))
        .returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to update payment transaction status', err as Error);
    }
  }

  // Logs
  async createLog(data: NewPaymentLog): Promise<PaymentLog> {
    try {
      const db = getDb();
      const result = await db.insert(paymentLogs).values(data).returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to create payment log', err as Error);
    }
  }

  // Refunds
  async createRefund(data: NewPaymentRefund): Promise<PaymentRefund> {
    try {
      const db = getDb();
      const result = await db.insert(paymentRefunds).values(data).returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to create payment refund', err as Error);
    }
  }
}

export const gatewayPaymentRepository = new GatewayPaymentRepository();
