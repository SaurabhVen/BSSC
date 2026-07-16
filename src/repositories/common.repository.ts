import { eq, lt, and } from 'drizzle-orm';
import { getDb } from '../database/drizzle';
import {
  otps,
  captchas,
  documents,
  payments,
  invoices,
  type Otp,
  type NewOtp,
  type Captcha,
  type NewCaptcha,
  type Document,
  type NewDocument,
  type Payment,
  type NewPayment,
  type Invoice,
  type NewInvoice,
} from '../database/schema';
import { DatabaseError, NotFoundError } from '../errors/AppError';

// ── OTP Repository ────────────────────────────────────────────

export class OtpRepository {
  async create(data: NewOtp): Promise<Otp> {
    try {
      const db = getDb();
      const result = await db.insert(otps).values(data).returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to create OTP', err as Error);
    }
  }

  async findByRequestId(otpRequestId: string): Promise<Otp | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(otps)
        .where(eq(otps.otpRequestId, otpRequestId))
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find OTP by request ID', err as Error);
    }
  }

  async findByToken(token: string): Promise<Otp | null> {
    try {
      const db = getDb();
      const result = await db.select().from(otps).where(eq(otps.token, token)).limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find OTP by token', err as Error);
    }
  }

  async markVerified(otpId: string, token: string): Promise<void> {
    try {
      const db = getDb();
      await db.update(otps).set({ verified: true, token }).where(eq(otps.id, otpId));
    } catch (err) {
      throw new DatabaseError('Failed to mark OTP verified', err as Error);
    }
  }

  async updateResendTime(otpId: string, newResendAt: Date): Promise<void> {
    try {
      const db = getDb();
      await db.update(otps).set({ resendAt: newResendAt }).where(eq(otps.id, otpId));
    } catch (err) {
      throw new DatabaseError('Failed to update resend time', err as Error);
    }
  }

  async deleteExpired(): Promise<void> {
    try {
      const db = getDb();
      await db.delete(otps).where(lt(otps.expiresAt, new Date()));
    } catch (err) {
      throw new DatabaseError('Failed to delete expired OTPs', err as Error);
    }
  }
}

// ── CAPTCHA Repository ────────────────────────────────────────

export class CaptchaRepository {
  async create(data: NewCaptcha): Promise<Captcha> {
    try {
      const db = getDb();
      const result = await db.insert(captchas).values(data).returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to create captcha', err as Error);
    }
  }

  async findById(id: string): Promise<Captcha | null> {
    try {
      const db = getDb();
      const result = await db.select().from(captchas).where(eq(captchas.id, id)).limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find captcha', err as Error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = getDb();
      await db.delete(captchas).where(eq(captchas.id, id));
    } catch (err) {
      throw new DatabaseError('Failed to delete captcha', err as Error);
    }
  }

  async deleteExpired(): Promise<void> {
    try {
      const db = getDb();
      await db.delete(captchas).where(lt(captchas.expiresAt, new Date()));
    } catch (err) {
      throw new DatabaseError('Failed to delete expired captchas', err as Error);
    }
  }
}

// ── Document Repository ───────────────────────────────────────

export class DocumentRepository {
  async create(data: NewDocument): Promise<Document> {
    try {
      const db = getDb();
      const result = await db.insert(documents).values(data).returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to create document record', err as Error);
    }
  }

  async findById(id: string): Promise<Document | null> {
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(id)) return null;

    try {
      const db = getDb();
      const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find document', err as Error);
    }
  }

  async findByCandidateId(candidateId: string): Promise<Document[]> {
    try {
      const db = getDb();
      return db.select().from(documents).where(eq(documents.candidateId, candidateId));
    } catch (err) {
      throw new DatabaseError('Failed to fetch candidate documents', err as Error);
    }
  }

  async findByCandidateAndType(
    candidateId: string,
    documentType: string
  ): Promise<Document | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(documents)
        .where(
          and(eq(documents.candidateId, candidateId), eq(documents.documentType, documentType))
        )
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to fetch document by type', err as Error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = getDb();
      await db.delete(documents).where(eq(documents.id, id));
    } catch (err) {
      throw new DatabaseError('Failed to delete document', err as Error);
    }
  }

  async update(id: string, data: Partial<NewDocument>): Promise<Document> {
    try {
      const db = getDb();
      const result = await db
        .update(documents)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(documents.id, id))
        .returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to update document record', err as Error);
    }
  }
}

// ── Payment Repository ────────────────────────────────────────

export class PaymentRepository {
  async create(data: NewPayment): Promise<Payment> {
    try {
      const db = getDb();
      const result = await db.insert(payments).values(data).returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to create payment record', err as Error);
    }
  }

  async findById(id: string): Promise<Payment | null> {
    try {
      const db = getDb();
      const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find payment', err as Error);
    }
  }

  async findByApplicationId(applicationId: string): Promise<Payment[]> {
    try {
      const db = getDb();
      return db.select().from(payments).where(eq(payments.applicationId, applicationId));
    } catch (err) {
      throw new DatabaseError('Failed to fetch payments by application', err as Error);
    }
  }

  async findByOrderId(paymentOrderId: string): Promise<Payment | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(payments)
        .where(eq(payments.paymentOrderId, paymentOrderId))
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find payment by order ID', err as Error);
    }
  }

  async findByRcptId(rcptId: string): Promise<Payment | null> {
    try {
      const db = getDb();
      const partialId = rcptId.replace('rcpt_', '').split('_')[0];

      const allPending = await db
        .select()
        .from(payments)
        .where(eq(payments.status, 'pending'));

      for (const p of allPending) {
        const appPrefix = p.applicationId.substring(0, 20).replace(/-/g, '');
        if (appPrefix === partialId) {
          return p;
        }
      }
      return null;
    } catch (err) {
      throw new DatabaseError('Failed to find payment by rcpt ID', err as Error);
    }
  }

  async updateStatus(
    paymentId: string,
    updates: Partial<
      Pick<Payment, 'status' | 'transactionId' | 'paymentMode' | 'bankName' | 'gatewayResponse' | 'payJson'>
    >
  ): Promise<Payment> {
    try {
      const db = getDb();
      const result = await db
        .update(payments)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(payments.id, paymentId))
        .returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to update payment status', err as Error);
    }
  }
}

// ── Invoice Repository ────────────────────────────────────────

export class InvoiceRepository {
  async create(data: NewInvoice): Promise<Invoice> {
    try {
      const db = getDb();
      const result = await db.insert(invoices).values(data).returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to create invoice record', err as Error);
    }
  }

  async findById(id: string): Promise<Invoice | null> {
    try {
      const db = getDb();
      const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find invoice by ID', err as Error);
    }
  }

  async findByPaymentId(paymentId: string): Promise<Invoice | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(invoices)
        .where(eq(invoices.paymentId, paymentId))
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find invoice by payment ID', err as Error);
    }
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(invoices)
        .where(eq(invoices.invoiceNumber, invoiceNumber))
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find invoice by invoice number', err as Error);
    }
  }
}

// ── Singleton Instances ───────────────────────────────────────

export const otpRepository = new OtpRepository();
export const captchaRepository = new CaptchaRepository();
export const documentRepository = new DocumentRepository();
export const paymentRepository = new PaymentRepository();
export const invoiceRepository = new InvoiceRepository();
