import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getDb } from '../database/drizzle';
import { disabilities } from '../database/schema';
import { response } from '../helpers/response';
import { DatabaseError } from '../errors/AppError';
import type { LambdaResponse } from '../types';

export class DisabilityController {
  // ── GET /disabilities ───────────────────────────────────────────
  // List all disabilities

  async list(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    try {
      const db = getDb();
      const allDisabilities = await db.select().from(disabilities);
      return response.success(200, {
        message: 'Disabilities fetched successfully',
        data: allDisabilities,
        total: allDisabilities.length,
      });
    } catch (err) {
      throw new DatabaseError('Failed to fetch disabilities', err as Error);
    }
  }
}

export const disabilityController = new DisabilityController();
export default disabilityController;
