import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { documentController } from '../controllers/document.controller';
import { errorHandler } from '../middleware/errorHandler';

export const upload = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  documentController.upload(event)
);

export const getAll = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  documentController.getAll(event)
);

export const getDownloadUrl = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  documentController.getDownloadUrl(event)
);

export const getPresignedUrl = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  documentController.getPresignedUrl(event)
);

export const deleteDocument = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  documentController.delete(event)
);

export const getUploadPresignedUrl = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  documentController.getUploadPresignedUrl(event)
);

export const getPublicUploadPresignedUrl = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  documentController.getPublicUploadPresignedUrl(event)
);
