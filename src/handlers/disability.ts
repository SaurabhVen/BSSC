import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { disabilityController } from '../controllers/disability.controller';
import { errorHandler } from '../middleware/errorHandler';

export const listDisabilities = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  disabilityController.list(event)
);
