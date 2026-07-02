import type { APIGatewayProxyEventV2, Handler, Context } from 'aws-lambda';
import type { LambdaResponse } from '../types';
import { AppError } from '../errors/AppError';
import { response } from '../helpers/response';
import config from '../config';

type AsyncHandler = (event: APIGatewayProxyEventV2, context: Context) => Promise<LambdaResponse>;

export const errorHandler = (handler: AsyncHandler): Handler => {
  return async (event: APIGatewayProxyEventV2, context: Context): Promise<LambdaResponse> => {
    try {
      console.log('[Event]', JSON.stringify(event, null, 2));
      return await handler(event, context);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (config.NODE_ENV !== 'production') {
        console.error('[ErrorHandler]', error.message, error.stack);
        if (err && typeof err === 'object' && 'internalError' in err && err.internalError) {
          console.error('[ErrorHandler] Internal Cause:', err.internalError);
        }
      }

      if (err instanceof AppError) {
        return response.error(err.statusCode, {
          message: err.message,
          errors: err.errors,
          ...(config.NODE_ENV !== 'production' && { stack: err.stack }),
        });
      }

      return response.error(500, {
        message:
          'We experienced an unexpected issue. Please try again or contact support if the problem persists.',
        ...(config.NODE_ENV !== 'production' && { stack: error.stack }),
      });
    }
  };
};

export default errorHandler;
