import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { applicationController } from '../controllers/application.controller';
import { errorHandler } from '../middleware/errorHandler';

export const submit = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  applicationController.submit(event)
);
