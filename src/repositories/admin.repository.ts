import { eq, and, desc, ilike, or, count, inArray, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../database/drizzle';
import {
  users,
  candidates,
  applications,
  documents,
  payments,
  applicationStepData,
  candidateQualifications,
  candidatePostPreferences,
  candidateLanguages,
  posts,
} from '../database/schema';
import { DatabaseError } from '../errors/AppError';

// ── Filter types ───────────────────────────────────────────────

export interface CandidateListFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string; // draft | submitted | locked
  gender?: string;
  category?: string;
  isSubmitted?: boolean;
  mobileVerified?: boolean;
  emailVerified?: boolean;
  fromDate?: string; // ISO date
  toDate?: string; // ISO date
  sortBy?: 'createdAt' | 'name' | 'email' | 'registrationNumber';
  sortOrder?: 'asc' | 'desc';
}

export interface CandidateListResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: {
    totalApplications: number;
    completedApplications: number;
    verifiedApplications: number;
    pendingApplications: number;
  };
}

// ── Admin Repository ────────────────────────────────────────────

export class AdminRepository {
  // ── 1. Paginated candidate list with filters ─────────────────

  async listCandidates(filter: CandidateListFilter): Promise<CandidateListResult> {
    try {
      const db = getDb();
      const {
        page = 1,
        limit = 20,
        search,
        status,
        isSubmitted,
        mobileVerified,
        emailVerified,
        fromDate,
        toDate,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filter;

      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions: any[] = [];

      if (search) {
        conditions.push(
          or(
            ilike(users.email, `%${search}%`),
            ilike(users.fullName, `%${search}%`),
            ilike(candidates.mobileNumber, `%${search}%`),
            ilike(candidates.registrationNumber, `%${search}%`)
          )
        );
      }

      if (status) {
        conditions.push(eq(applications.status, status));
      }

      if (isSubmitted !== undefined) {
        conditions.push(eq(applications.isSubmitted, isSubmitted));
      }

      if (mobileVerified !== undefined) {
        conditions.push(eq(candidates.mobileVerified, mobileVerified));
      }

      if (emailVerified !== undefined) {
        conditions.push(eq(candidates.emailVerified, emailVerified));
      }

      if (fromDate) {
        let fdStr = String(fromDate);
        if (fdStr.includes('-') && fdStr.split('-')[0].length <= 2)
          fdStr = fdStr.split('-').reverse().join('-');
        else if (fdStr.includes('/')) fdStr = fdStr.split('/').reverse().join('-');
        conditions.push(gte(candidates.createdAt, new Date(fdStr)));
      }

      if (toDate) {
        let tdStr = String(toDate);
        if (tdStr.includes('-') && tdStr.split('-')[0].length <= 2)
          tdStr = tdStr.split('-').reverse().join('-');
        else if (tdStr.includes('/')) tdStr = tdStr.split('/').reverse().join('-');
        const to = new Date(tdStr);
        to.setHours(23, 59, 59, 999);
        conditions.push(lte(candidates.createdAt, to));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Map sortBy field to column
      const sortColumnMap: Record<string, any> = {
        createdAt: candidates.createdAt,
        name: users.fullName,
        email: users.email,
        registrationNumber: candidates.registrationNumber,
      };
      const sortColumn = sortColumnMap[sortBy] ?? candidates.createdAt;

      // Count total records
      const countResult = await db
        .select({ count: count() })
        .from(candidates)
        .innerJoin(users, eq(candidates.userId, users.id))
        .leftJoin(applications, eq(applications.candidateId, candidates.id))
        .where(whereClause);

      const total = Number(countResult[0]?.count ?? 0);
      const totalPages = Math.ceil(total / limit);

      // Fetch paginated data
      const rows = await db
        .select({
          id: candidates.id,
          registrationNumber: candidates.registrationNumber,
          dateOfBirth: candidates.dateOfBirth,
          mobileNumber: candidates.mobileNumber,
          alternateNumber: candidates.alternateNumber,
          mobileVerified: candidates.mobileVerified,
          emailVerified: candidates.emailVerified,
          createdAt: candidates.createdAt,
          userId: users.id,
          email: users.email,
          fullName: users.fullName,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          applicationId: applications.id,
          applicationStatus: applications.status,
          currentStep: applications.currentStep,
          isSubmitted: applications.isSubmitted,
          applicationReferenceNumber: applications.applicationReferenceNumber,
          submissionDate: applications.submissionDate,
        })
        .from(candidates)
        .innerJoin(users, eq(candidates.userId, users.id))
        .leftJoin(applications, eq(applications.candidateId, candidates.id))
        .where(whereClause)
        .orderBy(sortOrder === 'asc' ? sql`${sortColumn} asc` : desc(sortColumn))
        .limit(limit)
        .offset(offset);

      // Count overall application stats
      const [totalAppCount] = await db.select({ count: count() }).from(applications);
      const [completedAppCount] = await db
        .select({ count: count() })
        .from(applications)
        .where(eq(applications.isSubmitted, true));
      const [verifiedAppCount] = await db
        .select({ count: count() })
        .from(applications)
        .where(eq(applications.status, 'verified'));
      const [pendingAppCount] = await db
        .select({ count: count() })
        .from(applications)
        .where(eq(applications.status, 'draft'));

      return {
        data: rows.map((r) => ({
          id: r.id,
          registrationNumber: r.registrationNumber,
          dateOfBirth: r.dateOfBirth,
          mobileNumber: r.mobileNumber,
          alternateNumber: r.alternateNumber,
          mobileVerified: r.mobileVerified,
          emailVerified: r.emailVerified,
          createdAt: r.createdAt,
          user: {
            id: r.userId,
            email: r.email,
            fullName: r.fullName,
            isActive: r.isActive,
            lastLoginAt: r.lastLoginAt,
          },
          application: r.applicationId
            ? {
                id: r.applicationId,
                status: r.applicationStatus,
                currentStep: r.currentStep,
                isSubmitted: r.isSubmitted,
                applicationReferenceNumber: r.applicationReferenceNumber,
                submissionDate: r.submissionDate,
              }
            : null,
        })),
        total,
        page,
        limit,
        totalPages,
        stats: {
          totalApplications: Number(totalAppCount?.count ?? 0),
          completedApplications: Number(completedAppCount?.count ?? 0),
          verifiedApplications: Number(verifiedAppCount?.count ?? 0),
          pendingApplications: Number(pendingAppCount?.count ?? 0),
        },
      };
    } catch (err) {
      throw new DatabaseError('Failed to list candidates', err as Error);
    }
  }

  // ── 2. Get single candidate with full detail ─────────────────

  async getCandidateDetail(candidateId: string): Promise<any | null> {
    try {
      const db = getDb();

      const rows = await db
        .select({
          id: candidates.id,
          registrationNumber: candidates.registrationNumber,
          dateOfBirth: candidates.dateOfBirth,
          mobileNumber: candidates.mobileNumber,
          alternateNumber: candidates.alternateNumber,
          mobileVerified: candidates.mobileVerified,
          emailVerified: candidates.emailVerified,
          createdAt: candidates.createdAt,
          updatedAt: candidates.updatedAt,
          userId: users.id,
          email: users.email,
          fullName: users.fullName,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          applicationId: applications.id,
          applicationStatus: applications.status,
          currentStep: applications.currentStep,
          completedSteps: applications.completedSteps,
          isSubmitted: applications.isSubmitted,
          applicationReferenceNumber: applications.applicationReferenceNumber,
          submissionDate: applications.submissionDate,
        })
        .from(candidates)
        .innerJoin(users, eq(candidates.userId, users.id))
        .leftJoin(applications, eq(applications.candidateId, candidates.id))
        .where(eq(candidates.id, candidateId))
        .limit(1);

      if (!rows[0]) return null;

      const row = rows[0];

      // Fetch documents
      const docs = await db.select().from(documents).where(eq(documents.candidateId, candidateId));

      // Fetch step data if application exists
      let stepData: any[] = [];
      let qualificationsList: any[] = [];
      let postPreferencesList: any[] = [];
      let languagesList: any[] = [];

      if (row.applicationId) {
        stepData = await db
          .select()
          .from(applicationStepData)
          .where(eq(applicationStepData.applicationId, row.applicationId));

        qualificationsList = await db
          .select()
          .from(candidateQualifications)
          .where(eq(candidateQualifications.applicationId, row.applicationId));

        postPreferencesList = await db
          .select({
            id: candidatePostPreferences.id,
            postCode: candidatePostPreferences.postCode,
            priority: candidatePostPreferences.priority,
            isRegular: candidatePostPreferences.isRegular,
            isBacklog: candidatePostPreferences.isBacklog,
            postName: posts.postName,
          })
          .from(candidatePostPreferences)
          .leftJoin(posts, eq(candidatePostPreferences.postCode, posts.postCode))
          .where(eq(candidatePostPreferences.applicationId, row.applicationId));

        languagesList = await db
          .select()
          .from(candidateLanguages)
          .where(eq(candidateLanguages.applicationId, row.applicationId));
      }

      // Fetch payments if application exists
      let paymentList: any[] = [];
      if (row.applicationId) {
        paymentList = await db
          .select()
          .from(payments)
          .where(eq(payments.applicationId, row.applicationId));
      }

      return {
        id: row.id,
        registrationNumber: row.registrationNumber,
        dateOfBirth: row.dateOfBirth,
        mobileNumber: row.mobileNumber,
        alternateNumber: row.alternateNumber,
        mobileVerified: row.mobileVerified,
        emailVerified: row.emailVerified,
        isVerified:
          row.mobileVerified &&
          row.emailVerified &&
          docs.length > 0 &&
          docs.every((doc: any) => doc.isVerified),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: {
          id: row.userId,
          email: row.email,
          fullName: row.fullName,
          isActive: row.isActive,
          lastLoginAt: row.lastLoginAt,
        },
        application: row.applicationId
          ? {
              id: row.applicationId,
              status: row.applicationStatus,
              currentStep: row.currentStep,
              completedSteps: row.completedSteps,
              isSubmitted: row.isSubmitted,
              applicationReferenceNumber: row.applicationReferenceNumber,
              submissionDate: row.submissionDate,
            }
          : null,
        documents: docs,
        stepData: stepData.reduce<Record<number, any>>((acc, s) => {
          acc[s.stepNumber] = s.data;
          return acc;
        }, {}),
        qualifications: qualificationsList,
        postPreferences: postPreferencesList,
        languages: languagesList[0] || null,
        payments: paymentList,
      };
    } catch (err) {
      throw new DatabaseError('Failed to fetch candidate detail', err as Error);
    }
  }

  // ── 3. Get candidate documents (paginated) ───────────────────

  async getCandidateDocuments(
    candidateId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const db = getDb();
      const offset = (page - 1) * limit;

      const totalResult = await db
        .select({ count: count() })
        .from(documents)
        .where(eq(documents.candidateId, candidateId));

      const total = Number(totalResult[0]?.count ?? 0);

      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.candidateId, candidateId))
        .orderBy(desc(documents.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: docs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (err) {
      throw new DatabaseError('Failed to fetch candidate documents', err as Error);
    }
  }

  // ── 4. Get statistics / summary ──────────────────────────────

  async getStats(): Promise<any> {
    try {
      const db = getDb();

      const [totalCandidates] = await db.select({ count: count() }).from(candidates);
      const [totalApplications] = await db.select({ count: count() }).from(applications);
      const [submittedApplications] = await db
        .select({ count: count() })
        .from(applications)
        .where(eq(applications.isSubmitted, true));
      const [draftApplications] = await db
        .select({ count: count() })
        .from(applications)
        .where(and(eq(applications.isSubmitted, false), eq(applications.status, 'draft')));
      const [totalDocuments] = await db.select({ count: count() }).from(documents);
      const [totalPayments] = await db.select({ count: count() }).from(payments);
      const [paidPayments] = await db
        .select({ count: count() })
        .from(payments)
        .where(eq(payments.status, 'completed'));

      return {
        candidates: {
          total: Number(totalCandidates?.count ?? 0),
        },
        applications: {
          total: Number(totalApplications?.count ?? 0),
          submitted: Number(submittedApplications?.count ?? 0),
          draft: Number(draftApplications?.count ?? 0),
        },
        documents: {
          total: Number(totalDocuments?.count ?? 0),
        },
        payments: {
          total: Number(totalPayments?.count ?? 0),
          paid: Number(paidPayments?.count ?? 0),
        },
      };
    } catch (err) {
      throw new DatabaseError('Failed to fetch admin stats', err as Error);
    }
  }

  // ── 5. Get all candidates for XLSX export (no pagination) ────

  async listCandidatesForExport(
    filter: Omit<CandidateListFilter, 'page' | 'limit'>
  ): Promise<any[]> {
    try {
      const db = getDb();
      const { search, status, isSubmitted, mobileVerified, emailVerified, fromDate, toDate } =
        filter;

      const conditions: any[] = [];

      if (search) {
        conditions.push(
          or(
            ilike(users.email, `%${search}%`),
            ilike(users.fullName, `%${search}%`),
            ilike(candidates.mobileNumber, `%${search}%`),
            ilike(candidates.registrationNumber, `%${search}%`)
          )
        );
      }
      if (status) conditions.push(eq(applications.status, status));
      if (isSubmitted !== undefined) conditions.push(eq(applications.isSubmitted, isSubmitted));
      if (mobileVerified !== undefined)
        conditions.push(eq(candidates.mobileVerified, mobileVerified));
      if (emailVerified !== undefined) conditions.push(eq(candidates.emailVerified, emailVerified));
      if (fromDate) {
        let fdStr = String(fromDate);
        if (fdStr.includes('-') && fdStr.split('-')[0].length <= 2)
          fdStr = fdStr.split('-').reverse().join('-');
        else if (fdStr.includes('/')) fdStr = fdStr.split('/').reverse().join('-');
        conditions.push(gte(candidates.createdAt, new Date(fdStr)));
      }
      if (toDate) {
        let tdStr = String(toDate);
        if (tdStr.includes('-') && tdStr.split('-')[0].length <= 2)
          tdStr = tdStr.split('-').reverse().join('-');
        else if (tdStr.includes('/')) tdStr = tdStr.split('/').reverse().join('-');
        const to = new Date(tdStr);
        to.setHours(23, 59, 59, 999);
        conditions.push(lte(candidates.createdAt, to));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: candidates.id,
          registrationNumber: candidates.registrationNumber,
          dateOfBirth: candidates.dateOfBirth,
          mobileNumber: candidates.mobileNumber,
          alternateNumber: candidates.alternateNumber,
          mobileVerified: candidates.mobileVerified,
          emailVerified: candidates.emailVerified,
          createdAt: candidates.createdAt,
          email: users.email,
          fullName: users.fullName,
          isActive: users.isActive,
          applicationStatus: applications.status,
          currentStep: applications.currentStep,
          isSubmitted: applications.isSubmitted,
          applicationReferenceNumber: applications.applicationReferenceNumber,
          submissionDate: applications.submissionDate,
        })
        .from(candidates)
        .innerJoin(users, eq(candidates.userId, users.id))
        .leftJoin(applications, eq(applications.candidateId, candidates.id))
        .where(whereClause)
        .orderBy(desc(candidates.createdAt));

      return rows;
    } catch (err) {
      throw new DatabaseError('Failed to export candidates', err as Error);
    }
  }

  // ── 6. Update document verification status ───────────────────

  async verifyDocument(documentId: string, isVerified: boolean): Promise<any> {
    try {
      const db = getDb();

      // 1. Retrieve the document to find the candidateId
      const docRows = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (docRows.length === 0) {
        return null;
      }

      const candidateId = docRows[0].candidateId;

      // 2. Perform updates in a transaction
      const result = await db.transaction(async (tx) => {
        // Update all documents for this candidate
        await tx
          .update(documents)
          .set({ isVerified, updatedAt: new Date() })
          .where(eq(documents.candidateId, candidateId));

        // Update candidate contact verification flags
        await tx
          .update(candidates)
          .set({
            mobileVerified: isVerified,
            emailVerified: isVerified,
            updatedAt: new Date(),
          })
          .where(eq(candidates.id, candidateId));

        // Fetch and return the originally requested document
        const updatedDocs = await tx
          .select()
          .from(documents)
          .where(eq(documents.id, documentId))
          .limit(1);

        return updatedDocs[0] ?? null;
      });

      return result;
    } catch (err) {
      throw new DatabaseError('Failed to update document and candidate verification', err as Error);
    }
  }
}

export const adminRepository = new AdminRepository();
export default adminRepository;
