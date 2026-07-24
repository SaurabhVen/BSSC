import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import { verifyJwt, type JwtPayload } from '../utils/cognito';
import { getAuthorizationToken } from '../helpers/request';
import { userRepository } from '../repositories/user.repository';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: string[];
}

export const authenticate = async (event: APIGatewayProxyEventV2): Promise<AuthenticatedUser> => {
  const token = getAuthorizationToken(event);
  if (!token)
    throw new UnauthorizedError(
      'The username or password you entered is incorrect. Please check your details and try again.'
    );

  let decoded: JwtPayload;
  try {
    decoded = await verifyJwt(token);
  } catch (err: unknown) {
    throw new UnauthorizedError((err as Error).message);
  }
  console.log('Decoded JWT payload:', decoded);

  
  let email = decoded.email;
  if (!email) {
    throw new UnauthorizedError('Invalid token: email claim is missing.');
  }

  let userId = '';

  if (userRepository && typeof userRepository.findByEmail === 'function') {
    const dbUser = await userRepository.findByEmail(email);
    if (!dbUser) {
      throw new UnauthorizedError(
        'We could not find an account with these details. Please register a new account or check your information.'
      );
    }
    if (!dbUser.isActive) {
      throw new UnauthorizedError(
        'Your account is currently deactivated. Please contact our support team for assistance.'
      );
    }
    userId = dbUser.id;
    email = dbUser.email;
  }

  return {
    userId,
    email,
    roles: decoded['cognito:groups'] || [],
  };
};

export const requireRole = (user: AuthenticatedUser, allowedRoles: string[]): void => {
  console.log(user.roles, 'awanish');
  const hasRole = user.roles.some((role) => allowedRoles.includes(role));
  if (!hasRole) {
    throw new ForbiddenError(
      `Access requires one of the following roles: ${allowedRoles.join(', ')}`
    );
  }
};

export const authenticateUser = authenticate;
export default authenticate;
