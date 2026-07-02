import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getDb } from '../database/drizzle';
import { subjects } from '../database/schema';
import { eq } from 'drizzle-orm';
import { seedSubjects } from '../database/seeders/subjects.seeder';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { ValidationError, DatabaseError } from '../errors/AppError';
import type { LambdaResponse } from '../types';

export class SubjectController {
  // ── POST /subjects/seed ─────────────────────────────────────
  // Seeds all 15 predefined subjects into the database

  async seed(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const result = await seedSubjects();
    return response.success(200, {
      message: 'Subjects seeded successfully',
      inserted: result.inserted,
      skipped: result.skipped,
      totalInserted: result.inserted.length,
      totalSkipped: result.skipped.length,
    });
  }

  // ── POST /subjects ──────────────────────────────────────────
  // Insert a single subject via API

  async create(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);

    if (
      !body?.subjectName ||
      typeof body.subjectName !== 'string' ||
      body.subjectName.trim().length === 0
    ) {
      throw new ValidationError([
        { field: 'subjectName', message: 'subjectName is required and must be a non-empty string' },
      ]);
    }

    const subjectName = body.subjectName.trim();

    try {
      const db = getDb();

      // Check for duplicate
      const existing = await db
        .select()
        .from(subjects)
        .where(eq(subjects.subjectName, subjectName))
        .limit(1);

      if (existing.length > 0) {
        return response.success(200, {
          message: 'Subject already exists',
          subject: existing[0],
        });
      }

      const result = await db.insert(subjects).values({ subjectName }).returning();

      return response.created({
        message: 'Subject created successfully',
        subject: result[0],
      });
    } catch (err) {
      throw new DatabaseError('Failed to create subject', err as Error);
    }
  }

  // ── GET /subjects ───────────────────────────────────────────
  // List all subjects

  async list(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    try {
      const db = getDb();
      const allSubjects = await db.select().from(subjects);
      return response.success(200, {
        message: 'Subjects fetched successfully',
        data: allSubjects,
        total: allSubjects.length,
      });
    } catch (err) {
      throw new DatabaseError('Failed to fetch subjects', err as Error);
    }
  }
}

export const subjectController = new SubjectController();
export default subjectController;
