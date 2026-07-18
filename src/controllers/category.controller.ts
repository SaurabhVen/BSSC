import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getDb } from '../database/drizzle';
import { categories } from '../database/schema';
import { eq, isNull } from 'drizzle-orm';
import { seedCategories } from '../database/seeders/categories.seeder';
import { response } from '../helpers/response';
import { parseEvent } from '../helpers/request';
<<<<<<< HEAD
import { ValidationError, DatabaseError } from '../errors/AppError';
=======
import { ValidationError, DatabaseError, NotFoundError } from '../errors/AppError';
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
import type { LambdaResponse } from '../types';

export class CategoryController {
  // ── POST /categories/seed ───────────────────────────────────
  // Seeds all predefined categories & sub-categories

  async seed(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const result = await seedCategories();
    return response.success(200, {
      message: 'Categories seeded successfully',
      inserted: result.inserted,
      skipped: result.skipped,
      totalInserted: result.inserted.length,
      totalSkipped: result.skipped.length,
    });
  }

  // ── POST /categories ────────────────────────────────────────
  // Insert a single category or sub-category via API

  async create(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { body } = parseEvent(event);

    if (!body?.catName || typeof body.catName !== 'string' || body.catName.trim().length === 0) {
      throw new ValidationError([
        { field: 'catName', message: 'catName is required and must be a non-empty string' },
      ]);
    }

    const catName = body.catName.trim();
    const catUserId = typeof body.catUserId === 'number' ? body.catUserId : 1;
    const catParentId = typeof body.catParentId === 'number' ? body.catParentId : null;
    const catPublish = typeof body.catPublish === 'number' ? body.catPublish : 1;

    try {
      const db = getDb();

      // Check for duplicate
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.catName, catName))
        .limit(1);

      if (existing.length > 0) {
        return response.success(200, {
          message: 'Category already exists',
          category: existing[0],
        });
      }

      const result = await db
        .insert(categories)
        .values({ catUserId, catName, catParentId, catPublish })
        .returning();

      return response.created({
        message: 'Category created successfully',
        category: result[0],
      });
    } catch (err) {
      throw new DatabaseError('Failed to create category', err as Error);
    }
  }

  // ── GET /categories ─────────────────────────────────────────
  // List all categories with their sub-categories nested

  async list(_event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    try {
      const db = getDb();
      const allCategories = await db.select().from(categories);

      const buildTree = (parentId: number | null): any[] => {
        return allCategories
          .filter((c) => c.catParentId === parentId)
          .map((cat) => {
            const subCategories = buildTree(cat.catId);
            return {
              value:
                cat.catId ||
                String(cat.catName || '')
                  .toLowerCase()
                  .replace(/\s+/g, '_'),
              label: cat.catName || '',
              ...(subCategories.length > 0 ? { subCategories } : { subCategories: [] }),
            };
          });
      };

      const nested = buildTree(null);

      return response.success(200, {
        message: 'Categories fetched successfully',
        data: nested,
        total: allCategories.length,
      });
    } catch (err) {
      throw new DatabaseError('Failed to fetch categories', err as Error);
    }
  }
<<<<<<< HEAD
=======

  // ── GET /categories/{catId} ─────────────────────────────────
  // Find category by ID (numeric) or category value (string)

  async find(event: APIGatewayProxyEventV2): Promise<LambdaResponse> {
    const { pathParameters } = parseEvent(event);
    const catIdStr = pathParameters?.catId;

    if (!catIdStr) {
      throw new ValidationError([
        { field: 'catId', message: 'Category ID or value is required' },
      ]);
    }

    const catId = parseInt(catIdStr, 10);
    const db = getDb();

    try {
      let categoryRecord;

      if (isNaN(catId)) {
        // Find by catValue
        const result = await db
          .select()
          .from(categories)
          .where(eq(categories.catValue, catIdStr))
          .limit(1);
        if (result.length > 0) {
          categoryRecord = result[0];
        }
      } else {
        // Find by catId
        const result = await db
          .select()
          .from(categories)
          .where(eq(categories.catId, catId))
          .limit(1);
        if (result.length > 0) {
          categoryRecord = result[0];
        }
      }

      if (!categoryRecord) {
        throw new NotFoundError(`Category not found with identifier: ${catIdStr}`);
      }

      return response.success(200, {
        message: 'Category retrieved successfully',
        data: categoryRecord,
      });
    } catch (err) {
      if (err instanceof ValidationError || err instanceof NotFoundError) {
        throw err;
      }
      throw new DatabaseError('Failed to fetch category', err as Error);
    }
  }
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
}

export const categoryController = new CategoryController();
export default categoryController;
