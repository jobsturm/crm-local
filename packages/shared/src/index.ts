/**
 * Shared Package Entry Point
 * Re-exports all DTOs and constants for use in frontend and backend
 *
 * NOTE: Storage utilities are NOT exported here to keep the bundle browser-safe.
 * Backend should import storage utils directly: import { ... } from '@crm-local/shared/utils/storage'
 */

// DTOs and constants (browser-safe)
export * from './dto';
