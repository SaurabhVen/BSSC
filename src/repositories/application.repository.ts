import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getDb } from '../database/drizzle';
import {
  applications,
  applicationStepData,
  type Application,
  type NewApplication,
  type ApplicationStepDatum,
  type NewApplicationStepDatum,
} from '../database/schema';
import { DatabaseError, NotFoundError } from '../errors/AppError';

export class ApplicationRepository {
  // ── Applications ─────────────────────────────────────────────

  async findByCandidateId(candidateId: string): Promise<Application[]> {
    try {
      const db = getDb();
      return db
        .select()
        .from(applications)
        .where(eq(applications.candidateId, candidateId))
        .orderBy(desc(applications.createdAt));
    } catch (err) {
      throw new DatabaseError('Failed to fetch applications by candidate', err as Error);
    }
  }

  async findById(id: string): Promise<Application | null> {
    try {
      const db = getDb();


      const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);

      return result[0] ?? null;
    } catch (err) {
      console.error('Inner DB Error in findById:', err);
      throw new DatabaseError('Failed to fetch application by ID', err as Error);
    }
  }

  async findDraftByCandidateId(candidateId: string): Promise<Application | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(applications)
        .where(and(eq(applications.candidateId, candidateId), eq(applications.isSubmitted, false)))
        .orderBy(desc(applications.updatedAt))
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to fetch draft application', err as Error);
    }
  }

  async create(data: NewApplication): Promise<Application> {
    try {
      const db = getDb();
      const result = await db.insert(applications).values(data).returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to create application', err as Error);
    }
  }

  async updateStatus(applicationId: string, status: string): Promise<void> {
    try {
      const db = getDb();
      await db
        .update(applications)
        .set({ status, updatedAt: new Date() })
        .where(eq(applications.id, applicationId));
    } catch (err) {
      throw new DatabaseError('Failed to update application status', err as Error);
    }
  }

  async updateCurrentStep(
    applicationId: string,
    currentStep: number,
    completedSteps: number[]
  ): Promise<void> {
    try {
      const db = getDb();
      await db
        .update(applications)
        .set({ currentStep, completedSteps, updatedAt: new Date() })
        .where(eq(applications.id, applicationId));
    } catch (err) {
      throw new DatabaseError('Failed to update application step', err as Error);
    }
  }

  async submit(applicationId: string, referenceNumber: string): Promise<Application> {
    try {
      const db = getDb();
      const result = await db
        .update(applications)
        .set({
          isSubmitted: true,
          status: 'submitted',
          applicationReferenceNumber: referenceNumber,
          submissionDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(applications.id, applicationId))
        .returning();
      return result[0];
    } catch (err) {
      throw new DatabaseError('Failed to submit application', err as Error);
    }
  }

  // ── Application Step Data ─────────────────────────────────────

  async getStepData(
    applicationId: string,
    stepNumber: number
  ): Promise<ApplicationStepDatum | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(applicationStepData)
        .where(
          and(
            eq(applicationStepData.applicationId, applicationId),
            eq(applicationStepData.stepNumber, stepNumber)
          )
        )
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to fetch step data', err as Error);
    }
  }

  async getAllStepData(applicationId: string): Promise<ApplicationStepDatum[]> {
    try {
      const db = getDb();
      return db
        .select()
        .from(applicationStepData)
        .where(eq(applicationStepData.applicationId, applicationId))
        .orderBy(applicationStepData.stepNumber);
    } catch (err) {
      throw new DatabaseError('Failed to fetch all step data', err as Error);
    }
  }

  async upsertStepData(
    applicationId: string,
    stepNumber: number,
    data: Record<string, unknown>
  ): Promise<ApplicationStepDatum> {
    try {
      const db = getDb();
      const existing = await this.getStepData(applicationId, stepNumber);

      if (existing) {
        const result = await db
          .update(applicationStepData)
          .set({ data, updatedAt: new Date() })
          .where(eq(applicationStepData.id, existing.id))
          .returning();
        return result[0];
      } else {
        const result = await db
          .insert(applicationStepData)
          .values({ applicationId, stepNumber, data })
          .returning();
        return result[0];
      }
    } catch (err) {
      throw new DatabaseError('Failed to upsert step data', err as Error);
    }
  }
}

export const applicationRepository = new ApplicationRepository();
export default applicationRepository;
