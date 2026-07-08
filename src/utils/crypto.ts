import { createHmac, randomBytes, randomUUID as cryptoRandomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const generateHash = async (plainText: string): Promise<string> =>
  bcrypt.hash(plainText, SALT_ROUNDS);

export const compareHash = async (plainText: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plainText, hash);

export const generateOTP = (length: number = 6): string => {
  const num = randomBytes(4).readUInt32BE(0);
  const max = Math.pow(10, length);
  return (num % max).toString().padStart(length, '0');
};

export const generateRandomToken = (): string => randomBytes(32).toString('hex');

export const generateUUID = (): string => cryptoRandomUUID();

export const generateHmac = (data: string, secret: string): string =>
  createHmac('sha256', secret).update(data).digest('hex');

export const generateRegistrationNumber = (prefix: string = 'REG'): string => {
  const year = new Date().getFullYear();
  const random = randomBytes(4).readUInt32BE(0).toString().padStart(8, '0');
  return `${prefix}${year}${random}`.substring(0, 18).toUpperCase();
};
