/**
 * Storage Service
 *
 * Handles reading/writing the JSON database and document files.
 * Uses atomically for safe writes.
 */

import { join } from 'node:path';
import { mkdir, cp, rm } from 'node:fs/promises';
import type { DatabaseDto, DocumentDto, DocumentFileDto } from '@crm-local/shared';
import { EMPTY_DATABASE, CURRENT_DATABASE_VERSION, createDocumentFile } from '@crm-local/shared';
import {
  writeJsonFile,
  safeReadJsonFile,
  fileExists,
  listSubdirectories,
  listJsonFiles,
} from '@crm-local/shared/utils';
import { runMigrations, needsMigration } from '../migrations';

export class StorageService {
  private databasePath: string;
  private offersPath: string;
  private invoicesPath: string;
  private database: DatabaseDto | null = null;

  constructor(private storagePath: string) {
    this.databasePath = join(storagePath, 'database.json');
    this.offersPath = join(storagePath, 'offers');
    this.invoicesPath = join(storagePath, 'invoices');
  }

  /**
   * Initialize storage - create directories and load/create database
   */
  async initialize(): Promise<void> {
    // Create directories
    await mkdir(this.storagePath, { recursive: true });
    await mkdir(this.offersPath, { recursive: true });
    await mkdir(this.invoicesPath, { recursive: true });

    // Load or create database
    if (fileExists(this.databasePath)) {
      const result = await safeReadJsonFile<DatabaseDto>(this.databasePath);
      if (result.success) {
        // Check if migration is needed
        if (needsMigration(result.data.version)) {
          console.log(`Database version ${result.data.version} requires migration`);
          this.database = runMigrations(result.data);
          // Save the migrated database
          await this.saveDatabase();
        } else {
          this.database = result.data;
        }
      } else {
        console.error('Failed to load database:', result.error);
        throw new Error('Failed to load database');
      }
    } else {
      // Create new empty database
      this.database = {
        ...EMPTY_DATABASE,
        version: CURRENT_DATABASE_VERSION,
        settings: {
          ...EMPTY_DATABASE.settings,
          updatedAt: new Date().toISOString(),
        },
      };
      await this.saveDatabase();
    }
  }

  /**
   * Get the current database
   */
  getDatabase(): DatabaseDto {
    if (!this.database) {
      throw new Error('Storage not initialized');
    }
    return this.database;
  }

  /**
   * Save the database to disk
   */
  async saveDatabase(): Promise<void> {
    if (!this.database) {
      throw new Error('Storage not initialized');
    }
    await writeJsonFile(this.databasePath, this.database);
  }

  /**
   * Update database and save
   */
  async updateDatabase(updater: (db: DatabaseDto) => void): Promise<void> {
    if (!this.database) {
      throw new Error('Storage not initialized');
    }
    updater(this.database);
    await this.saveDatabase();
  }

  // ============================================================
  // Document File Operations
  // ============================================================

  /**
   * Get the file path for a document
   */
  getDocumentPath(documentType: 'offer' | 'invoice', year: string, documentNumber: string): string {
    const basePath = documentType === 'offer' ? this.offersPath : this.invoicesPath;
    return join(basePath, year, `${documentNumber}.json`);
  }

  /**
   * Save a document to disk
   */
  async saveDocument(document: DocumentDto): Promise<void> {
    const year = new Date(document.createdAt).getFullYear().toString();
    const basePath = document.documentType === 'offer' ? this.offersPath : this.invoicesPath;
    const yearPath = join(basePath, year);

    // Ensure year directory exists
    await mkdir(yearPath, { recursive: true });

    const filePath = join(yearPath, `${document.documentNumber}.json`);
    const fileData: DocumentFileDto = createDocumentFile(document);

    await writeJsonFile(filePath, fileData);
  }

  /**
   * Load a document from disk by searching all year directories
   */
  async loadDocument(
    documentType: 'offer' | 'invoice',
    documentId: string
  ): Promise<DocumentDto | null> {
    const basePath = documentType === 'offer' ? this.offersPath : this.invoicesPath;
    const years = await listSubdirectories(basePath);

    for (const year of years) {
      const files = await listJsonFiles(join(basePath, year));
      for (const filePath of files) {
        const result = await safeReadJsonFile<DocumentFileDto>(filePath);
        if (result.success && result.data.document.id === documentId) {
          return result.data.document;
        }
      }
    }

    return null;
  }

  /**
   * Load a document by document number
   */
  async loadDocumentByNumber(
    documentType: 'offer' | 'invoice',
    documentNumber: string
  ): Promise<DocumentDto | null> {
    const basePath = documentType === 'offer' ? this.offersPath : this.invoicesPath;
    const years = await listSubdirectories(basePath);

    for (const year of years) {
      const filePath = join(basePath, year, `${documentNumber}.json`);
      if (fileExists(filePath)) {
        const result = await safeReadJsonFile<DocumentFileDto>(filePath);
        if (result.success) {
          return result.data.document;
        }
      }
    }

    return null;
  }

  /**
   * Delete a document file
   */
  async deleteDocument(document: DocumentDto): Promise<void> {
    const year = new Date(document.createdAt).getFullYear().toString();
    const basePath = document.documentType === 'offer' ? this.offersPath : this.invoicesPath;
    const filePath = join(basePath, year, `${document.documentNumber}.json`);

    const { unlink } = await import('node:fs/promises');
    await unlink(filePath);
  }

  /**
   * List all documents of a type (returns summaries, not full documents)
   */
  async listDocuments(documentType?: 'offer' | 'invoice'): Promise<DocumentDto[]> {
    const documents: DocumentDto[] = [];
    const types = documentType ? [documentType] : (['offer', 'invoice'] as const);

    for (const type of types) {
      const basePath = type === 'offer' ? this.offersPath : this.invoicesPath;
      const years = await listSubdirectories(basePath);

      for (const year of years) {
        const files = await listJsonFiles(join(basePath, year));
        for (const filePath of files) {
          const result = await safeReadJsonFile<DocumentFileDto>(filePath);
          if (result.success) {
            documents.push(result.data.document);
          }
        }
      }
    }

    // Sort by createdAt descending (newest first)
    return documents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Get the current storage path
   */
  getStoragePath(): string {
    return this.storagePath;
  }

  /**
   * Migrate all data to a new storage path
   * 
   * @param newPath The new directory to store data in
   * @param deleteOld Whether to delete the old data after successful migration
   * @returns The new storage path on success
   */
  async migrateToNewPath(newPath: string, deleteOld: boolean = false): Promise<string> {
    // Validate that new path is different
    if (newPath === this.storagePath) {
      throw new Error('New path is the same as current path');
    }

    // Store old paths for potential cleanup
    const oldStoragePath = this.storagePath;

    // Create new directory structure
    const newDatabasePath = join(newPath, 'database.json');
    const newOffersPath = join(newPath, 'offers');
    const newInvoicesPath = join(newPath, 'invoices');

    await mkdir(newPath, { recursive: true });
    await mkdir(newOffersPath, { recursive: true });
    await mkdir(newInvoicesPath, { recursive: true });

    // Copy database.json
    if (fileExists(this.databasePath)) {
      await cp(this.databasePath, newDatabasePath);
    }

    // Copy offers directory (with all subdirectories)
    if (fileExists(this.offersPath)) {
      await cp(this.offersPath, newOffersPath, { recursive: true });
    }

    // Copy invoices directory (with all subdirectories)
    if (fileExists(this.invoicesPath)) {
      await cp(this.invoicesPath, newInvoicesPath, { recursive: true });
    }

    // Update internal paths
    this.storagePath = newPath;
    this.databasePath = newDatabasePath;
    this.offersPath = newOffersPath;
    this.invoicesPath = newInvoicesPath;

    // Delete old data if requested
    if (deleteOld) {
      try {
        await rm(oldStoragePath, { recursive: true, force: true });
      } catch (e) {
        // Log but don't fail if cleanup fails
        console.warn('Failed to delete old storage path:', e);
      }
    }

    return newPath;
  }

  /**
   * Reset all data - delete everything and start fresh
   */
  async resetAllData(): Promise<void> {
    // Delete offers directory
    try {
      await rm(this.offersPath, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }

    // Delete invoices directory
    try {
      await rm(this.invoicesPath, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }

    // Recreate directories
    await mkdir(this.offersPath, { recursive: true });
    await mkdir(this.invoicesPath, { recursive: true });

    // Reset database to empty state
    this.database = {
      ...EMPTY_DATABASE,
      version: CURRENT_DATABASE_VERSION,
      settings: {
        ...EMPTY_DATABASE.settings,
        updatedAt: new Date().toISOString(),
      },
    };
    await this.saveDatabase();
  }
}
