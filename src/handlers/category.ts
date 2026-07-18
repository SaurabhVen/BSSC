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
<<<<<<< HEAD
=======

export const findCategory = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  categoryController.find(event)
);
>>>>>>> b5d3be6e099ba6bac81a614738a5b4b0d8414e74
