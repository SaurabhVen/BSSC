import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { degreeController } from '../controllers/degree.controller';
import { errorHandler } from '../middleware/errorHandler';

export const seedDegrees = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  degreeController.seed(event)
);

export const createDegree = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  degreeController.create(event)
);

export const listDegrees = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  degreeController.list(event)
);
