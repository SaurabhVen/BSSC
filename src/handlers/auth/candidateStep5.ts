import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { authController } from '../../controllers/auth.controller';
import { errorHandler } from '../../middleware/errorHandler';

export const handler: APIGatewayProxyHandlerV2 = errorHandler(
  authController.candidateStep5.bind(authController)
);
