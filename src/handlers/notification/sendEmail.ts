import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { notificationController } from '../../controllers/notification.controller';
import { errorHandler } from '../../middleware/errorHandler';

export const handler = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  notificationController.sendEmail(event)
);
