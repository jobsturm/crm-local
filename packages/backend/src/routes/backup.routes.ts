import { Router } from 'express';
import type { StorageService } from '../services/storage.service.js';
import { BackupService } from '../services/backup.service.js';

export function createBackupRoutes(storage: StorageService, backup: BackupService): Router {
  const router = Router();

  router.post('/', async (_req, res) => {
    const result = await backup.runBackup(true);
    if (result.error === 'in-progress') {
      res.status(409).json({ error: 'Backup already in progress' });
      return;
    }
    if (!result.success) {
      res.status(500).json({ error: result.error ?? 'Backup failed' });
      return;
    }
    res.json(result);
  });

  router.get('/', async (_req, res) => {
    const [backups, lastBackupTimestamp] = await Promise.all([
      backup.listBackups(),
      backup.getLastBackupTimestamp(),
    ]);
    res.json({
      backups,
      lastBackupTimestamp,
      backupPath: backup.getBackupPath(),
    });
  });

  router.post('/validate-path', async (req, res) => {
    const { path } = req.body as { path?: string };
    if (!path) {
      res.status(400).json({ ok: false, error: 'path is required' });
      return;
    }
    const result = await BackupService.validateCustomPath(path, storage.getStoragePath());
    res.json(result);
  });

  return router;
}
