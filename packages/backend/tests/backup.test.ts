import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Express } from 'express';
import type { StorageService } from '../src/services/storage.service.js';
import type { BackupService } from '../src/services/backup.service.js';

let app: Express;
let testDataPath: string;
let storageService: StorageService;
let backupService: BackupService;

describe('Backup System', () => {
  beforeAll(async () => {
    testDataPath = join(tmpdir(), `crm-backup-test-${Date.now()}`);
    await mkdir(testDataPath, { recursive: true });
    const { createApp } = await import('../src/index.js');
    app = createApp(testDataPath);
    storageService = (app as Express & { storageService: StorageService }).storageService;
    backupService = (app as Express & { backupService: BackupService }).backupService;
    await storageService.initialize();
    await request(app).post('/api/customers').send({ name: 'Test BV', email: 'test@test.nl' });
  });

  afterAll(async () => {
    await rm(testDataPath, { recursive: true, force: true });
  });

  it('POST /api/backup creates backup folder with all expected files', async () => {
    const res = await request(app).post('/api/backup');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const backupFolder = res.body.path as string;
    expect(existsSync(join(backupFolder, 'database.json'))).toBe(true);
    expect(existsSync(join(backupFolder, 'customers.csv'))).toBe(true);
    expect(existsSync(join(backupFolder, 'products.csv'))).toBe(true);
    expect(existsSync(join(backupFolder, 'invoices.csv'))).toBe(true);
    expect(existsSync(join(backupFolder, 'offers.csv'))).toBe(true);
    expect(existsSync(join(backupFolder, 'document-items.csv'))).toBe(true);
  });

  it('customers.csv has UTF-8 BOM and correct headers', async () => {
    const res = await request(app).post('/api/backup');
    const csvPath = join(res.body.path as string, 'customers.csv');
    const content = await readFile(csvPath, 'utf-8');
    expect(content.charCodeAt(0)).toBe(0xFEFF);
    expect(content).toContain('id,name,email');
  });

  it('GET /api/backup returns list of backups', async () => {
    const res = await request(app).get('/api/backup');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.backups)).toBe(true);
    expect(res.body.backups.length).toBeGreaterThan(0);
    expect(res.body.lastBackupTimestamp).toBeTypeOf('number');
  });

  it('rotation keeps only 30 backups', async () => {
    for (let i = 0; i < 31; i++) {
      await backupService.runBackup(true);
      await new Promise((r) => setTimeout(r, 5));
    }
    const backups = await backupService.listBackups();
    expect(backups.length).toBeLessThanOrEqual(30);
  });

  it('checkAndRun skips backup when last backup was recent', async () => {
    const backupPath = backupService.getBackupPath();
    await writeFile(
      join(backupPath, '.last-backup.json'),
      JSON.stringify({ lastBackupTimestamp: Date.now(), lastBackupFolder: 'recent' }),
    );
    const countBefore = (await backupService.listBackups()).length;
    await backupService.checkAndRun();
    const countAfter = (await backupService.listBackups()).length;
    expect(countAfter).toBe(countBefore);
  });

  it('checkAndRun creates backup when last backup was >24h ago', async () => {
    const backupPath = backupService.getBackupPath();
    await writeFile(
      join(backupPath, '.last-backup.json'),
      JSON.stringify({ lastBackupTimestamp: Date.now() - 90_000_000, lastBackupFolder: 'old' }),
    );
    const backupsBefore = await backupService.listBackups();
    const newestBefore = backupsBefore[0]?.timestamp ?? '';
    await backupService.checkAndRun();
    const backupsAfter = await backupService.listBackups();
    const newestAfter = backupsAfter[0]?.timestamp ?? '';
    expect(newestAfter).not.toBe(newestBefore);
  });

  it('POST /api/backup/validate-path rejects path inside storagePath', async () => {
    const subPath = join(testDataPath, 'subdir');
    const res = await request(app).post('/api/backup/validate-path').send({ path: subPath });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('inside-storage');
  });

  it('POST /api/backup/validate-path accepts valid external path', async () => {
    const externalPath = join(tmpdir(), `crm-backup-external-${Date.now()}`);
    const res = await request(app).post('/api/backup/validate-path').send({ path: externalPath });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    await rm(externalPath, { recursive: true, force: true });
  });

  it('concurrent runBackup calls: one succeeds, one returns in-progress', async () => {
    const [r1, r2] = await Promise.all([
      backupService.runBackup(true),
      backupService.runBackup(true),
    ]);
    const results = [r1, r2];
    expect(results.some((r) => r.success)).toBe(true);
    expect(results.some((r) => r.error === 'in-progress')).toBe(true);
  });
});
