/**
 * Common DTOs - Shared between Frontend and Backend
 */

/** Standard API error response */
export interface ApiErrorDto {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, string[]>; // field-level validation errors
}

/** Standard API success response wrapper */
export interface ApiResponseDto<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorDto;
}

/** Pagination request parameters */
export interface PaginationQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Pagination response metadata */
export interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Paginated response wrapper */
export interface PaginatedResponseDto<T> {
  items: T[];
  meta: PaginationMetaDto;
}

/** ID parameter for routes */
export interface IdParamDto {
  id: string;
}
