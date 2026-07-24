import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { authController } from '../../controllers/auth.controller';
import { errorHandler } from '../../middleware/errorHandler';
export const forgotRegistrationNumber = errorHandler((event: APIGatewayProxyEventV2, _ctx: Context) =>
  authController.forgotRegistrationNumber(event)
);
