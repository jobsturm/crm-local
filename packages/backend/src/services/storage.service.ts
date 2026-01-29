/**
 * Storage Service
 *
 * Handles reading/writing the JSON database and document files.
 * Uses atomically for safe writes.
 */

import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { DatabaseDto, DocumentDto, DocumentFileDto } from '@crm-local/shared';
import { EMPTY_DATABASE, CURRENT_DATABASE_VERSION, createDocumentFile } from '@crm-local/shared';
import {
  writeJsonFile,
  safeReadJsonFile,
  fileExists,
  listSubdirectories,
  listJsonFiles,
} from '@crm-local/shared/utils';

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
        this.database = result.data;
        // TODO: Check version and run migrations if needed
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
}
