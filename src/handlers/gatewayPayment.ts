import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { gatewayPaymentController } from '../controllers/gatewayPayment.controller';
import { errorHandler } from '../middleware/errorHandler';

export const create = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  gatewayPaymentController.create(event)
);

export const verify = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  gatewayPaymentController.verify(event)
);

export const getStatus = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  gatewayPaymentController.getStatus(event)
);

export const refund = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  gatewayPaymentController.refund(event)
);

export const webhook = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  gatewayPaymentController.webhook(event)
);

export const returnRedirect = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  gatewayPaymentController.returnRedirect(event)
);
