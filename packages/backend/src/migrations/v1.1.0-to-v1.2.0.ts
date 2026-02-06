/**
 * Migration: v1.1.0 → v1.2.0
 *
 * Adds product catalog:
 * - products: array of ProductDto
 */

import type { DatabaseDto } from '@crm-local/shared';

/** Database shape before migration (v1.1.0) */
interface DatabaseV1_1_0 {
  version: string;
  customers: unknown[];
  business: unknown | null;
  settings: unknown;
}

/**
 * Migrate database from v1.1.0 to v1.2.0
 */
export function migrate(data: DatabaseV1_1_0): DatabaseDto {
  return {
    ...data,
    version: '1.2.0',
    // Add empty products array
    products: [],
  } as unknown as DatabaseDto;
}

/** Source version this migration handles */
export const fromVersion = '1.1.0';

/** Target version after migration */
export const toVersion = '1.2.0';
