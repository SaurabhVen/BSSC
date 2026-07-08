import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { publicController } from '../controllers/public.controller';
import { errorHandler } from '../middleware/errorHandler';

export const getAgeLimits = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  publicController.getAgeLimits(event)
);

export const getCognitoSubId = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  publicController.getCognitoSubId(event)
);

