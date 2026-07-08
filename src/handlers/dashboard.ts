import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { dashboardController } from '../controllers/dashboard.controller';
import { errorHandler } from '../middleware/errorHandler';

export const getDashboard = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  dashboardController.getDashboard(event)
);

export const getNotifications = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  dashboardController.getNotifications(event)
);

export const getAdmitCard = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  dashboardController.getAdmitCard(event)
);

export const getResult = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  dashboardController.getResult(event)
);
