import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config';

export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateTokens = (userId: string, email: string, roles: string[]) => {
  const accessToken = jwt.sign(
    { userId, email, roles },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { userId },
    config.JWT_SECRET,
    { expiresIn: '30d' }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600,
  };
};

export const verifyJwt = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
  } catch (err) {
    throw new Error('Your session has expired. Please log in again to continue.');
  }
};
