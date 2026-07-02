import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

interface ZodFieldError {
  path: (string | number)[];
  message: string;
}

const formatZodErrors = (zodError: ZodError): Array<{ field: string; message: string }> =>
  zodError.errors.map((e: ZodFieldError) => ({
    field: e.path.join('.'),
    message: e.message,
  }));

export const validate = <T>(schema: ZodSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(formatZodErrors(result.error));
  }
  return result.data;
};

export default validate;
