import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../database/drizzle';
import { paidCandidates, type PaidCandidate } from '../database/schema';
import { DatabaseError } from '../errors/AppError';

export class PaidCandidateRepository {
  async findByDetails(
    regId: number,
    fatherName: string,
    motherName: string
  ): Promise<PaidCandidate | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(paidCandidates)
        .where(
          and(
            eq(paidCandidates.regId, regId),
            sql`LOWER(${paidCandidates.fatherName}) = LOWER(${fatherName.trim()})`,
            sql`LOWER(${paidCandidates.motherName}) = LOWER(${motherName.trim()})`
          )
        )
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to fetch paid candidate by details', err as Error);
    }
  }

  async findByRegId(regId: number): Promise<PaidCandidate | null> {
    try {
      const db = getDb();
      const result = await db
        .select()
        .from(paidCandidates)
        .where(eq(paidCandidates.regId, regId))
        .limit(1);
      return result[0] ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to fetch paid candidate by registration ID', err as Error);
    }
  }
}

export const paidCandidateRepository = new PaidCandidateRepository();
export default paidCandidateRepository;
