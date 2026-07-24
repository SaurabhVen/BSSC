import { eq, and, desc, inArray } from 'drizzle-orm';
import { getDb } from '../database/drizzle';
import {
  users,
  candidates,
  candidateMetadata,
  type User,
  type NewUser,
  type Candidate,
  type NewCandidate,
} from '../database/schema';
import { DatabaseError, NotFoundError } from '../errors/AppError';
import { log } from 'node:console';

export class UserRepository {
  // ── Users ────────────────────────────────────────────────────

  async findByEmail(email: string): Promise<User | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find user by email', err as Error);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const db = getDb();
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find user by ID', err as Error);
    }
  }


  async create(data: NewUser): Promise<User> {
    try {
      console.log('Creating user with email:', data); // --- IGNORE ---
      const db = getDb();
      const result = await db
        .insert(users)
        .values({ ...data, email: data.email.toLowerCase() })
        .returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to create user', err as Error);
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      const db = getDb();
      await db
        .update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (err) {
      throw new DatabaseError('Failed to update last login', err as Error);
    }
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    try {
      const db = getDb();
      await db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (err) {
      throw new DatabaseError('Failed to update password', err as Error);
    }
  }

  async deactivate(userId: string): Promise<void> {
    try {
      const db = getDb();
      await db
        .update(users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (err) {
      throw new DatabaseError('Failed to deactivate user', err as Error);
    }
  }

  // ── Candidates ───────────────────────────────────────────────

  private mapJoinedCandidate(row: any): Candidate | null {
    if (!row) return null;
    const core = row.candidates;
    const meta = row.candidate_metadata || row.candidateMetadata;
    return {
      ...meta,
      ...core,
      id: core.id,
    } as unknown as Candidate;
  }

  async findCandidateByUserId(userId: string): Promise<Candidate | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(candidates)
        .leftJoin(candidateMetadata, eq(candidates.id, candidateMetadata.candidateId))
        .where(eq(candidates.userId, userId))
        .limit(1);
      return this.mapJoinedCandidate(result[0]);
    } catch (err) {
      throw new DatabaseError('Failed to find candidate by user ID', err as Error);
    }
  }

  async findCandidateById(id: string): Promise<Candidate | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(candidates)
        .leftJoin(candidateMetadata, eq(candidates.id, candidateMetadata.candidateId))
        .where(eq(candidates.id, id))
        .limit(1);
      return this.mapJoinedCandidate(result[0]);
    } catch (err) {
      throw new DatabaseError('Failed to find candidate by ID', err as Error);
    }
  }

  async findCandidateByRegistrationNumber(regNo: string): Promise<Candidate | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(candidates)
        .leftJoin(candidateMetadata, eq(candidates.id, candidateMetadata.candidateId))
        .where(eq(candidates.registrationNumber, regNo))
        .limit(1);
      return this.mapJoinedCandidate(result[0]);
    } catch (err) {
      throw new DatabaseError('Failed to find candidate by registration number', err as Error);
    }
  }

  async createCandidate(data: NewCandidate): Promise<Candidate> {
    try {
      const db = getDb();
      const result = await db.transaction(async (tx) => {
        const coreInsert = {
          id: data.id,
          userId: data.userId,
          registrationNumber: data.registrationNumber,
          oldRegistrationNumber: (data as any).oldRegistrationNumber,
          dateOfBirth: data.dateOfBirth,
          mobileNumber: data.mobileNumber,
          alternateNumber: data.alternateNumber,
          mobileVerified: data.mobileVerified,
          emailVerified: data.emailVerified,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
          version: data.version,
        };
        const coreRows = await tx.insert(candidates).values(coreInsert).returning();
        const core = coreRows[0];

        const metaInsert = {
          candidateId: core.id,
          gender: data.gender,
          category: data.category,
          caste: data.caste,
          biharDomicile: data.biharDomicile,
          isPwd: data.isPwd,
          disabilityType: data.disabilityType,
          pwd40Percent: data.pwd40Percent,
          isExServiceman: data.isExServiceman,
          isBiharGovtEmp: data.isBiharGovtEmp,
          isContractualEmp: data.isContractualEmp,
          bsscAttempts: data.bsscAttempts,
          nonCreamyLayer: data.nonCreamyLayer,
          servicePeriod: data.servicePeriod,
          postName: data.postName,
          hasAgreement: data.hasAgreement,
          contractualPeriod: data.contractualPeriod,
          domicileCertificateNumber: data.domicileCertificateNumber,
          domicileCertificateAuthority: data.domicileCertificateAuthority,
          domicileCertificateIssueDate: data.domicileCertificateIssueDate,
          categoryCertificateNumber: data.categoryCertificateNumber,
          categoryCertificateAuthority: data.categoryCertificateAuthority,
          categoryCertificateIssueDate: data.categoryCertificateIssueDate,
          pwdCertificateNumber: data.pwdCertificateNumber,
          pwdCertificateAuthority: data.pwdCertificateAuthority,
          pwdCertificateIssueDate: data.pwdCertificateIssueDate,
          disTypePersist: data.disTypePersist,
          isScribeRequired: data.isScribeRequired,
          organizationName: data.organizationName,
          hasPostExperience: data.hasPostExperience,
        };
        const metaRows = await tx.insert(candidateMetadata).values(metaInsert).returning();
        const meta = metaRows[0];

        return {
          ...core,
          ...meta,
          id: core.id,
        } as unknown as Candidate;
      });
      return result;
    } catch (err) {
      throw new DatabaseError('Failed to create candidate', err as Error);
    }
  }

  async updateCandidate(candidateId: string, updates: Partial<Candidate>, txClient?: any): Promise<void> {
    try {
      const db = txClient || getDb();
      const executeUpdates = async (tx: any) => {
        const coreUpdates: any = {};
        if (updates.alternateNumber !== undefined) coreUpdates.alternateNumber = updates.alternateNumber;
        if (updates.mobileNumber !== undefined) coreUpdates.mobileNumber = updates.mobileNumber;
        if (updates.dateOfBirth !== undefined) coreUpdates.dateOfBirth = updates.dateOfBirth;
        if (updates.mobileVerified !== undefined) coreUpdates.mobileVerified = updates.mobileVerified;
        if (updates.emailVerified !== undefined) coreUpdates.emailVerified = updates.emailVerified;
        if (updates.registrationNumber !== undefined) coreUpdates.registrationNumber = updates.registrationNumber;
        if (updates.oldRegistrationNumber !== undefined) coreUpdates.oldRegistrationNumber = updates.oldRegistrationNumber;
        if (updates.previouslyRegistered !== undefined) coreUpdates.previouslyRegistered = updates.previouslyRegistered;

        if (Object.keys(coreUpdates).length > 0) {
          await tx
            .update(candidates)
            .set({ ...coreUpdates, updatedAt: new Date() })
            .where(eq(candidates.id, candidateId));
        }

        const metaUpdates: any = {};
        const metaFields = [
          'gender', 'category', 'caste', 'biharDomicile', 'isPwd', 'disabilityType',
          'pwd40Percent', 'isExServiceman', 'isBiharGovtEmp', 'isContractualEmp',
          'bsscAttempts', 'nonCreamyLayer', 'servicePeriod', 'postName', 'hasAgreement',
          'contractualPeriod', 'domicileCertificateNumber', 'domicileCertificateAuthority',
          'domicileCertificateIssueDate', 'categoryCertificateNumber', 'categoryCertificateAuthority',
          'categoryCertificateIssueDate', 'pwdCertificateNumber', 'pwdCertificateAuthority',
          'pwdCertificateIssueDate', 'disTypePersist', 'isScribeRequired', 'organizationName',
          'hasPostExperience', 'governmentIdNumber', 'serviceFromDate', 'serviceToDate',
          'contractualFromDate', 'contractualToDate', 'isOwnScribe', 'typeOfExOfficer'
        ];

        for (const field of metaFields) {
          if ((updates as any)[field] !== undefined) {
            metaUpdates[field] = (updates as any)[field];
          }
        }

        if (Object.keys(metaUpdates).length > 0) {
          await tx
            .update(candidateMetadata)
            .set({ ...metaUpdates, updatedAt: new Date() })
            .where(eq(candidateMetadata.candidateId, candidateId));
        }
      };

      if (txClient) {
        await executeUpdates(txClient);
      } else {
        await db.transaction(async (tx: any) => {
          await executeUpdates(tx);
        });
      }
    } catch (err) {
      throw new DatabaseError('Failed to update candidate profile', err as Error);
    }
  }

  async updateCandidateVerification(
    candidateId: string,
    updates: Partial<Pick<Candidate, 'mobileVerified' | 'emailVerified'>>
  ): Promise<void> {
    try {
      const db = getDb();
      await db
        .update(candidates)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId));
    } catch (err) {
      throw new DatabaseError('Failed to update candidate verification', err as Error);
    }
  }

  async updateCandidateDetails(
    candidateId: string,
    updates: Partial<Pick<Candidate, 'dateOfBirth' | 'mobileNumber'>>
  ): Promise<void> {
    try {
      const db = getDb();
      await db
        .update(candidates)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId));
    } catch (err) {
      console.error('Actual DB Error in updateCandidateDetails:', err);
      throw new DatabaseError('Failed to update candidate details', err as Error);
    }
  }

  async updateCandidateRegistrationNumber(
    candidateId: string,
    registrationNumber: string
  ): Promise<void> {
    try {
      const db = getDb();
      await db
        .update(candidates)
        .set({ registrationNumber, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId));
    } catch (err) {
      throw new DatabaseError('Failed to update registration number', err as Error);
    }
  }

  async findAllCandidates(): Promise<any[]> {
    try {
      const db = getDb();
      const { applications, documents } = await import('../database/schema');
      const candidatesResult = await db
        .select({
          id: candidates.id,
          registrationNumber: candidates.registrationNumber,
          dateOfBirth: candidates.dateOfBirth,
          mobileNumber: candidates.mobileNumber,
          alternateNumber: candidates.alternateNumber,
          mobileVerified: candidates.mobileVerified,
          emailVerified: candidates.emailVerified,
          createdAt: candidates.createdAt,
          user: {
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            isActive: users.isActive,
            lastLoginAt: users.lastLoginAt,
          },
          application: {
            id: applications.id,
            status: applications.status,
            currentStep: applications.currentStep,
            isSubmitted: applications.isSubmitted,
            applicationReferenceNumber: applications.applicationReferenceNumber,
            submissionDate: applications.submissionDate,
          },
        })
        .from(candidates)
        .innerJoin(users, eq(candidates.userId, users.id))
        .leftJoin(applications, eq(applications.candidateId, candidates.id))
        .orderBy(desc(candidates.createdAt));

      if (candidatesResult.length === 0) {
        return [];
      }

      const candidateIds = candidatesResult.map((c) => c.id);
      const docsResult = await db
        .select({
          id: documents.id,
          candidateId: documents.candidateId,
          documentType: documents.documentType,
          fileName: documents.fileName,
          fileUrl: documents.fileUrl,
          mimeType: documents.mimeType,
          fileSize: documents.fileSize,
          isVerified: documents.isVerified,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(inArray(documents.candidateId, candidateIds));

      const docsByCandidate = docsResult.reduce<Record<string, any[]>>((acc, doc) => {
        if (!acc[doc.candidateId]) {
          acc[doc.candidateId] = [];
        }
        acc[doc.candidateId].push(doc);
        return acc;
      }, {});

      return candidatesResult.map((c) => ({
        ...c,
        documents: docsByCandidate[c.id] ?? [],
      }));
    } catch (err) {
      throw new DatabaseError('Failed to fetch all candidates', err as Error);
    }
  }

  async findUserWithRole(userId: string): Promise<(User & { roleName: string }) | null> {
    try {
      const db = getDb();
      const { roles } = await import('../database/schema');
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          fullName: users.fullName,
          roleId: users.roleId,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          roleName: roles.name,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, userId))
        .limit(1);

      if (!result[0]) return null;
      return result[0] as User & { roleName: string };
    } catch (err) {
      throw new DatabaseError('Failed to find user with role', err as Error);
    }
  }
}

export const userRepository = new UserRepository();
export default userRepository;
