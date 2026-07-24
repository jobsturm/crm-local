import { join, resolve, sep } from 'node:path';
import { mkdir, rm, writeFile, access, constants, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { CustomerDto, ProductDto, DocumentDto } from '@crm-local/shared';
import { writeJsonFile, safeReadJsonFile, listSubdirectories } from '@crm-local/shared/utils';
import { generateCsv } from '../utils/csv.js';
import type { StorageService } from './storage.service.js';

interface LastBackupState {
  lastBackupTimestamp: number;
  lastBackupFolder: string;
}

export class BackupService {
  private backupInProgress = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(private readonly storage: StorageService) {}

  getBackupPath(): string {
    const db = this.storage.getDatabase();
    const settings = db.settings;
    if (settings?.useCustomBackupPath && settings.customBackupPath) {
      return settings.customBackupPath;
    }
    return join(this.storage.getStoragePath(), 'backups');
  }

  static async validateCustomPath(
    path: string,
    storagePath: string,
  ): Promise<{ ok: boolean; error?: 'not-writable' | 'inside-storage' }> {
    const resolvedPath = resolve(path);
    const resolvedStorage = resolve(storagePath);
    if (resolvedPath.startsWith(resolvedStorage + sep)) {
      return { ok: false, error: 'inside-storage' };
    }
    try {
      await mkdir(resolvedPath, { recursive: true });
      await access(resolvedPath, constants.W_OK);
      return { ok: true };
    } catch {
      return { ok: false, error: 'not-writable' };
    }
  }

  async runBackup(force = false): Promise<{ success: boolean; path?: string; timestamp?: string; error?: string }> {
    if (this.backupInProgress) {
      return { success: false, error: 'in-progress' };
    }
    this.backupInProgress = true;

    try {
      const db = this.storage.getDatabase();
      const settings = db.settings;

      if (!force && settings?.backupEnabled === false) {
        return { success: false, error: 'disabled' };
      }

      const customers = db.customers ?? [];
      const products = db.products ?? [];
      const documents = await this.storage.listDocuments().catch(() => []);
      if (!force && customers.length === 0 && products.length === 0 && documents.length === 0) {
        return { success: false, error: 'empty' };
      }
      const backupPath = this.getBackupPath();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFolder = join(backupPath, timestamp);

      await mkdir(backupFolder, { recursive: true });

      const storagePath = this.storage.getStoragePath();

      for (const subdir of ['offers', 'invoices']) {
        const srcDir = join(storagePath, subdir);
        if (existsSync(srcDir)) {
          await cp(srcDir, join(backupFolder, subdir), { recursive: true });
        }
      }

      await this.writeCsvFiles(backupFolder, customers, products, documents);

      await writeJsonFile(join(backupFolder, 'database.json'), db);

      const lastBackupFile = join(backupPath, '.last-backup.json');
      await writeJsonFile(lastBackupFile, {
        lastBackupTimestamp: Date.now(),
        lastBackupFolder: timestamp,
      } satisfies LastBackupState);

      await this.rotate(backupPath, 30);

      console.log(`[backup] Backup created: ${backupFolder}`);
      return { success: true, path: backupFolder, timestamp };
    } catch (error) {
      console.error('[backup] Backup failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      this.backupInProgress = false;
    }
  }

  private async writeCsvFiles(
    backupFolder: string,
    customers: CustomerDto[],
    products: ProductDto[],
    documents: DocumentDto[],
  ): Promise<void> {
    const money = (cents: number): string => (cents / 100).toFixed(2);
    const isoDate = (iso: string): string => iso.slice(0, 10);

    const customerRows = customers.map((c) => [
      c.id, c.name, c.email, c.phone ?? '', c.company ?? '',
      c.address?.street ?? '', c.address?.city ?? '', c.address?.postalCode ?? '',
      c.address?.country ?? '', isoDate(c.createdAt),
    ]);
    await writeFile(
      join(backupFolder, 'customers.csv'),
      generateCsv(['id', 'name', 'email', 'phone', 'company', 'street', 'city', 'postalCode', 'country', 'createdAt'], customerRows),
      'utf-8',
    );

    const productRows = products.map((p) => [
      p.id, p.description, money(p.defaultPrice), isoDate(p.createdAt),
    ]);
    await writeFile(
      join(backupFolder, 'products.csv'),
      generateCsv(['id', 'description', 'defaultPrice', 'createdAt'], productRows),
      'utf-8',
    );

    const invoices = documents.filter((d) => d.documentType === 'invoice');
    const offers = documents.filter((d) => d.documentType === 'offer');

    const docRow = (d: DocumentDto) => [
      d.documentNumber, d.customer.name, d.status,
      money(d.subtotal), String(d.taxRate), money(d.taxAmount), money(d.total),
      isoDate(d.createdAt), isoDate(d.dueDate),
    ];
    const docHeaders = ['documentNumber', 'customerName', 'status', 'subtotal', 'taxRate', 'taxAmount', 'total', 'createdAt', 'dueDate'];

    await writeFile(join(backupFolder, 'invoices.csv'), generateCsv(docHeaders, invoices.map(docRow)), 'utf-8');
    await writeFile(join(backupFolder, 'offers.csv'), generateCsv(docHeaders, offers.map(docRow)), 'utf-8');

    const itemRows: (string | number)[][] = [];
    for (const doc of documents) {
      for (const item of doc.items) {
        itemRows.push([
          doc.documentNumber, doc.documentType, item.description,
          item.quantity, money(item.unitPrice), money(item.total),
        ]);
      }
    }
    await writeFile(
      join(backupFolder, 'document-items.csv'),
      generateCsv(['documentNumber', 'documentType', 'description', 'quantity', 'unitPrice', 'total'], itemRows),
      'utf-8',
    );
  }

  private async rotate(backupPath: string, maxCount: number): Promise<void> {
    try {
      const subdirs = await listSubdirectories(backupPath);
      const timestampFolders = subdirs
        .filter((d) => /^\d{4}-\d{2}-\d{2}T/.test(d))
        .sort()
        .reverse();
      const toDelete = timestampFolders.slice(maxCount);
      for (const folder of toDelete) {
        await rm(join(backupPath, folder), { recursive: true, force: true });
      }
    } catch (error) {
      console.error('[backup] Rotation failed:', error);
    }
  }

  async checkAndRun(): Promise<void> {
    const backupPath = this.getBackupPath();
    const lastBackupFile = join(backupPath, '.last-backup.json');
    const result = await safeReadJsonFile<LastBackupState>(lastBackupFile);
    const lastTimestamp = result.success ? result.data.lastBackupTimestamp : 0;
    if (Date.now() - lastTimestamp > 86_400_000) {
      await this.runBackup();
    }
  }

  start(): void {
    void this.checkAndRun();
    this.intervalHandle = setInterval(() => {
      void this.checkAndRun();
    }, 3_600_000);
    this.intervalHandle.unref();
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async listBackups(): Promise<Array<{ timestamp: string; path: string }>> {
    const backupPath = this.getBackupPath();
    try {
      const subdirs = await listSubdirectories(backupPath);
      return subdirs
        .filter((d) => /^\d{4}-\d{2}-\d{2}T/.test(d))
        .sort()
        .reverse()
        .map((d) => ({ timestamp: d, path: join(backupPath, d) }));
    } catch {
      return [];
    }
  }

  async getLastBackupTimestamp(): Promise<number | null> {
    const backupPath = this.getBackupPath();
    const lastBackupFile = join(backupPath, '.last-backup.json');
    const result = await safeReadJsonFile<LastBackupState>(lastBackupFile);
    return result.success ? result.data.lastBackupTimestamp : null;
  }
}
