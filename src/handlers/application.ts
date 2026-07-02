import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { applicationController } from '../controllers/application.controller';
import { errorHandler } from '../middleware/errorHandler';

export const getDraft = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  applicationController.getDraft(event)
);

export const getApplication = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  applicationController.getApplication(event)
);

export const getAllStepsData = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  applicationController.getAllStepsData(event)
);

export const saveStep = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  applicationController.saveStep(event)
);

export const getStep = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  applicationController.getStep(event)
);

export const getPrintPreview = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  applicationController.getPrintPreview(event)
);

export const finalSubmitLegacy = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  applicationController.finalSubmitLegacy(event)
);

export const unifiedFinalSubmit = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  applicationController.unifiedFinalSubmit(event)
);
