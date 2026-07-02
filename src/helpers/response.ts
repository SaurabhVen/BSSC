import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { LambdaResponse } from '../types';

interface SuccessPayload {
  message?: string;
  [key: string]: unknown;
}

interface ErrorPayload {
  message: string;
  errors?: Array<{ field?: string; message: string }>;
  stack?: string;
}

const getOrigin = (eventOrOrigin?: string | APIGatewayProxyEventV2): string | undefined => {
  if (!eventOrOrigin) return undefined;
  if (typeof eventOrOrigin === 'string') return eventOrOrigin;
  return eventOrOrigin.headers?.['origin'] || eventOrOrigin.headers?.['Origin'];
};

const buildHeaders = (eventOrOrigin?: string | APIGatewayProxyEventV2): Record<string, string> => {
  const origin = getOrigin(eventOrOrigin);
  const isDev = !process.env.NODE_ENV || ['development', 'dev'].includes(process.env.NODE_ENV);
  const allowedOrigin = origin || (isDev ? 'http://localhost:5173' : '*');
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key,X-Requested-With',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
};

export const response = {
  success(
    statusCode: number = 200,
    data: SuccessPayload = {},
    eventOrOrigin?: string | APIGatewayProxyEventV2
  ): LambdaResponse {
    return {
      statusCode,
      headers: buildHeaders(eventOrOrigin),
      body: JSON.stringify({ success: true, ...data }),
    };
  },

  error(
    statusCode: number = 500,
    errorData: ErrorPayload = { message: 'Internal Server Error' },
    eventOrOrigin?: string | APIGatewayProxyEventV2
  ): LambdaResponse {
    const { message, errors = [], ...rest } = errorData;
    return {
      statusCode,
      headers: buildHeaders(eventOrOrigin),
      body: JSON.stringify({
        success: false,
        message,
        errors,
        ...rest,
      }),
    };
  },

  created(data: SuccessPayload, eventOrOrigin?: string | APIGatewayProxyEventV2): LambdaResponse {
    return this.success(201, data, eventOrOrigin);
  },

  noContent(eventOrOrigin?: string | APIGatewayProxyEventV2): LambdaResponse {
    return {
      statusCode: 204,
      headers: buildHeaders(eventOrOrigin),
      body: '',
    };
  },

  redirect(url: string, eventOrOrigin?: string | APIGatewayProxyEventV2): LambdaResponse {
    const headers = buildHeaders(eventOrOrigin);
    // Overwrite content type if necessary, and set Location
    headers['Location'] = url;
    return {
      statusCode: 302,
      headers,
      body: '',
    };
  },
};

export default response;
