import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { publicController } from '../controllers/public.controller';
import { errorHandler } from '../middleware/errorHandler';

export const handler = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  publicController.getIpAddress(event)
);
