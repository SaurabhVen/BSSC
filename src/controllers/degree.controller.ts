import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getDb } from '../database/drizzle';
import { degrees } from '../database/schema';
import { eq, ilike } from 'drizzle-orm';
import { seedDegrees } from '../database/seeders/degrees.seeder';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
import { ValidationError, DatabaseError } from '../errors/AppError';
import type { LambdaResponse } from '../types';

export class DegreeController {
  // ── POST /degrees/seed ─────────────────────────────────────
  // Seeds predefined degrees into the database

  async seed(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const result = await seedDegrees();
    return response.success(200, {
      message: 'Degrees seeded successfully',
      inserted: result.inserted,
      skipped: result.skipped,
      totalInserted: result.inserted.length,
      totalSkipped: result.skipped.length,
    });
  }

  // ── POST /degrees ──────────────────────────────────────────

  // Insert a single degree via API


  async create(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);

    if (
      !body?.degreeName ||
      typeof body.degreeName !== 'string' ||
      body.degreeName.trim().length === 0
    ) {
      throw new ValidationError([
        { field: 'degreeName', message: 'degreeName is required and must be a non-empty string' },
      ]);
    }

    if (
      !body?.degreeType ||
      typeof body.degreeType !== 'string' ||
      body.degreeType.trim().length === 0
    ) {
      throw new ValidationError([
        { field: 'degreeType', message: 'degreeType is required and must be a non-empty string' },
      ]);
    }

    const degreeName = body.degreeName.trim();
    const degreeType = body.degreeType.trim();
    const postCodes =
      body.postCodes && typeof body.postCodes === 'string' ? body.postCodes.trim() : null;

    try {
      const db = getDb();

      // Check for duplicate
      const existing = await db
        .select()
        .from(degrees)
        .where(eq(degrees.degreeName, degreeName))
        .limit(1);

      if (existing.length > 0) {
        return response.success(200, {
          message: 'Degree already exists',
          degree: existing[0],
        });
      }

      const result = await db.insert(degrees).values({ degreeName, degreeType }).returning();

      return response.created({
        message: 'Degree created successfully',
        degree: result[0],
      });
    } catch (err) {
      throw new DatabaseError('Failed to create degree', err as Error);
    }
  }

  // ── GET /degrees ───────────────────────────────────────────
 
  // List all degrees


  async list(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    try {
      const db = getDb();
      const degreeType = event.queryStringParameters?.degreeType;

      let conditions = undefined;
      if (degreeType) {
        conditions = ilike(degrees.degreeType, `%${degreeType}%`);
      }

      const allDegrees = await db
        .select({
          degreeName: degrees.degreeName,
          degreeId: degrees.degreeId,
        })
        .from(degrees)
        .where(conditions);

      return response.success(200, {
        message: 'Degrees fetched successfully',
        data: allDegrees,
        total: allDegrees.length,
      });
    } catch (err) {
      throw new DatabaseError('Failed to fetch degrees', err as Error);
    }
  }
}

export const degreeController = new DegreeController();
export default degreeController;
