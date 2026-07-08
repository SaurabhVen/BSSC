export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    statusCode: number = 500,
    errors: Array<{ field?: string; message: string }> = []
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    errors: Array<{ field: string; message: string }> = [],
    message: string = 'Validation failed'
  ) {
    super(message, 422, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Requested resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource state conflict') {
    super(message, 409);
  }
}

export class DatabaseError extends AppError {
  public readonly internalError: Error | null;

  constructor(message: string = 'Database operation failed', internalError: Error | null = null) {
    super(message, 500);
    this.internalError = internalError;
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, 429);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message: string = 'Unsupported Media Type') {
    super(message, 415);
  }
}
