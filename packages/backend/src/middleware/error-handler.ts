/**
 * Global error handler middleware
 */

import type { Request, Response, NextFunction } from 'express';
import type { ApiErrorDto } from '@crm-local/shared';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err);

  if (err instanceof ApiError) {
    const response: ApiErrorDto = {
      statusCode: err.statusCode,
      message: err.message,
      error: err.name,
      details: err.details,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown error
  const response: ApiErrorDto = {
    statusCode: 500,
    message: 'Internal server error',
    error: 'InternalError',
  };
  res.status(500).json(response);
}

// Helper functions for common errors
export function notFound(message: string): ApiError {
  return new ApiError(404, message);
}

export function badRequest(message: string, details?: Record<string, string[]>): ApiError {
  return new ApiError(400, message, details);
}

export function conflict(message: string): ApiError {
  return new ApiError(409, message);
}
