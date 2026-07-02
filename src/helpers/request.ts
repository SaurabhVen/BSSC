import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { ParsedRequest } from '../types';
import { ValidationError } from '../errors/AppError';

export const parseBody = (event: APIGatewayProxyEventV2): Record<string, unknown> => {
  try {
    if (!event.body) return {};
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new ValidationError([], 'Invalid JSON request body');
  }
};

export const parseEvent = (event: APIGatewayProxyEventV2): ParsedRequest => ({
  body: parseBody(event),
  pathParameters: (event.pathParameters ?? {}) as Record<string, string>,
  queryStringParameters: (event.queryStringParameters ?? {}) as Record<string, string>,
  headers: (event.headers ?? {}) as Record<string, string>,
  requestContext: event.requestContext as unknown as Record<string, unknown>,
});

export const getCookieValue = (
  event: APIGatewayProxyEventV2,
  cookieName: string
): string | undefined => {
  const cookieHeader = event.headers?.['cookie'] ?? event.headers?.['Cookie'] ?? '';
  const match = cookieHeader.split(';').find((c) => c.trim().startsWith(`${cookieName}=`));
  return match?.split('=').slice(1).join('=').trim();
};

export const getAuthorizationToken = (event: APIGatewayProxyEventV2): string | undefined => {
  const authHeader = event.headers?.['authorization'] ?? event.headers?.['Authorization'];
  if (!authHeader) return undefined;
  const parts = authHeader.split(' ');
  return parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : undefined;
};

export const getPaginationParams = (
  queryStringParameters: Record<string, string>
): { page: number; limit: number; offset: number } => {
  const page = Math.max(1, parseInt(queryStringParameters?.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(queryStringParameters?.limit ?? '10', 10)));
  return { page, limit, offset: (page - 1) * limit };
};
