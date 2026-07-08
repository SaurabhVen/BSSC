import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { paymentController } from '../controllers/payment.controller';
import { errorHandler } from '../middleware/errorHandler';

export const initiate = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  paymentController.initiate(event)
);

export const verify = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  paymentController.verify(event)
);

export const getStatus = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  paymentController.getStatus(event)
);

export const getFeeStructure = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  paymentController.getFeeStructure(event)
);

export const getInvoice = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  paymentController.getInvoice(event)
);

export const freePaymentReturn = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  paymentController.freeReturn(event)
);
