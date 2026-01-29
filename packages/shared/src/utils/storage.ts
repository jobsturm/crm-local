/**
 * Storage Utilities - Safe JSON file read/write operations
 * 
 * Uses atomically (write-file-atomic) to prevent data corruption on crash
 */

import { writeFile } from 'atomically';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';

/**
 * Storage error types
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export type StorageErrorCode =
  | 'FILE_NOT_FOUND'
  | 'PARSE_ERROR'
  | 'WRITE_ERROR'
  | 'PERMISSION_ERROR'
  | 'DIRECTORY_NOT_FOUND';

/**
 * Result type for safe operations
 */
export type StorageResult<T> =
  | { success: true; data: T }
  | { success: false; error: StorageError };

/**
 * Read and parse a JSON file
 * 
 * @param filePath - Path to the JSON file
 * @returns Parsed data
 * @throws StorageError on failure
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  // Check if file exists
  if (!existsSync(filePath)) {
    throw new StorageError(
      `File not found: ${filePath}`,
      'FILE_NOT_FOUND'
    );
  }

  // Read file
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new StorageError(
      `Failed to read file: ${filePath}`,
      'PERMISSION_ERROR',
      err
    );
  }

  // Parse JSON
  try {
    return JSON.parse(content) as T;
  } catch (err) {
    throw new StorageError(
      `Invalid JSON in file: ${filePath}`,
      'PARSE_ERROR',
      err
    );
  }
}

/**
 * Safely read a JSON file, returning a result object instead of throwing
 */
export async function safeReadJsonFile<T>(
  filePath: string
): Promise<StorageResult<T>> {
  try {
    const data = await readJsonFile<T>(filePath);
    return { success: true, data };
  } catch (err) {
    if (err instanceof StorageError) {
      return { success: false, error: err };
    }
    return {
      success: false,
      error: new StorageError('Unknown error', 'PARSE_ERROR', err),
    };
  }
}

/**
 * Write data to a JSON file atomically
 * 
 * Uses write-file-atomic to ensure the file is either fully written
 * or not written at all (prevents corruption on crash)
 * 
 * @param filePath - Path to write to
 * @param data - Data to serialize and write
 */
export async function writeJsonFile<T>(
  filePath: string,
  data: T
): Promise<void> {
  // Ensure directory exists
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    try {
      await mkdir(dir, { recursive: true });
    } catch (err) {
      throw new StorageError(
        `Failed to create directory: ${dir}`,
        'PERMISSION_ERROR',
        err
      );
    }
  }

  // Serialize to JSON with pretty printing
  const content = JSON.stringify(data, null, 2);

  // Write atomically
  try {
    await writeFile(filePath, content);
  } catch (err) {
    throw new StorageError(
      `Failed to write file: ${filePath}`,
      'WRITE_ERROR',
      err
    );
  }
}

/**
 * Safely write a JSON file, returning a result object instead of throwing
 */
export async function safeWriteJsonFile<T>(
  filePath: string,
  data: T
): Promise<StorageResult<void>> {
  try {
    await writeJsonFile(filePath, data);
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof StorageError) {
      return { success: false, error: err };
    }
    return {
      success: false,
      error: new StorageError('Unknown error', 'WRITE_ERROR', err),
    };
  }
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * List all JSON files in a directory (non-recursive)
 * 
 * @param dirPath - Directory path
 * @returns Array of full file paths
 */
export async function listJsonFiles(dirPath: string): Promise<string[]> {
  if (!existsSync(dirPath)) {
    throw new StorageError(
      `Directory not found: ${dirPath}`,
      'DIRECTORY_NOT_FOUND'
    );
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => join(dirPath, entry.name));
}

/**
 * List all subdirectories in a directory
 * 
 * @param dirPath - Directory path
 * @returns Array of directory names (not full paths)
 */
export async function listSubdirectories(dirPath: string): Promise<string[]> {
  if (!existsSync(dirPath)) {
    return [];
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}

/**
 * Extract invoice number from filename
 * e.g., "INV-2026-0001.json" -> "INV-2026-0001"
 */
export function extractInvoiceNumberFromFilename(filePath: string): string {
  return basename(filePath, '.json');
}
