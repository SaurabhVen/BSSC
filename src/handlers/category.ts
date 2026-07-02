import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { categoryController } from '../controllers/category.controller';
import { errorHandler } from '../middleware/errorHandler';

export const seedCategories = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  categoryController.seed(event)
);

export const createCategory = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  categoryController.create(event)
);

export const listCategories = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  categoryController.list(event)
);
