import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Custom error classes
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
    timestamp: string;
    path?: string;
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: AppError | Error,
  path?: string
): NextResponse<ErrorResponse> {
  const timestamp = new Date().toISOString();

  // Handle known AppError instances
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.constructor.name,
          timestamp,
          path,
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return NextResponse.json(
      {
        error: {
          message: 'Validation failed',
          code: 'ValidationError',
          details: validationErrors,
          timestamp,
          path,
        },
      },
      { status: 400 }
    );
  }

  // Handle Prisma errors
  if (error.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    let message = 'Database error';
    let statusCode = 500;

    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        message = 'Resource already exists';
        statusCode = 409;
        break;
      case 'P2025': // Record not found
        message = 'Resource not found';
        statusCode = 404;
        break;
      case 'P2003': // Foreign key constraint
        message = 'Invalid reference';
        statusCode = 400;
        break;
      case 'P2014': // Invalid ID
        message = 'Invalid identifier';
        statusCode = 400;
        break;
      default:
        message = 'Database operation failed';
    }

    return NextResponse.json(
      {
        error: {
          message,
          code: prismaError.code,
          details: process.env.NODE_ENV === 'development' ? prismaError.meta : undefined,
          timestamp,
          path,
        },
      },
      { status: statusCode }
    );
  }

  // Handle other Prisma errors
  if (error.constructor.name === 'PrismaClientValidationError') {
    return NextResponse.json(
      {
        error: {
          message: 'Invalid database query',
          code: 'PrismaValidationError',
          timestamp,
          path,
        },
      },
      { status: 400 }
    );
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return NextResponse.json(
      {
        error: {
          message: 'Invalid JSON format',
          code: 'InvalidJSON',
          timestamp,
          path,
        },
      },
      { status: 400 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      error: {
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'Internal server error',
        code: 'InternalServerError',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp,
        path,
      },
    },
    { status: 500 }
  );
}

/**
 * API error handler wrapper
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);
      
      // Extract request path if available
      const request = args.find(arg => arg instanceof Request) as Request | undefined;
      const path = request ? new URL(request.url).pathname : undefined;
      
      return createErrorResponse(error as Error, path);
    }
  };
}

/**
 * Async error boundary for components
 */
export function handleAsyncError(error: Error): void {
  console.error('Async Error:', error);
  
  // In development, throw the error to trigger error boundary
  if (process.env.NODE_ENV === 'development') {
    throw error;
  }
  
  // In production, log the error silently
  // You can integrate with error tracking services here (Sentry, etc.)
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T = any>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

/**
 * Safe async operation with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error('Safe async operation failed:', error);
    return fallback ?? null;
  }
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries - 1) {
        throw lastError;
      }
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError!;
}

/**
 * Validate request method
 */
export function validateMethod(request: Request, allowedMethods: string[]): void {
  if (!allowedMethods.includes(request.method)) {
    throw new AppError(
      `Method ${request.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      405
    );
  }
}

/**
 * Validate content type
 */
export function validateContentType(request: Request, expectedType: string = 'application/json'): void {
  const contentType = request.headers.get('content-type');
  
  if (!contentType || !contentType.includes(expectedType)) {
    throw new ValidationError(`Content-Type must be ${expectedType}`);
  }
}

/**
 * Parse and validate JSON body
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
}

/**
 * Success response helper
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Paginated response helper
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

/**
 * Log error with context
 */
export function logError(error: Error, context?: Record<string, any>): void {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
  };
  
  console.error('Application Error:', JSON.stringify(errorLog, null, 2));
  
  // In production, you would send this to your logging service
  // Example: Winston, Sentry, CloudWatch, etc.
}