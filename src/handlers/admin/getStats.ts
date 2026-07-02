import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { adminController } from '../../controllers/admin.controller';
import { errorHandler } from '../../middleware/errorHandler';

export const handler = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  adminController.getStats(event)
);
