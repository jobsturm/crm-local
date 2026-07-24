/**
 * CRM Local Backend Server
 *
 * Express API server that handles:
 * - Customer CRUD
 * - Document (Offers/Invoices) CRUD
 * - Business info management
 * - Settings management
 */

import express, { type Express } from 'express';
import cors from 'cors';
import { createRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { StorageService } from './services/storage.service.js';
import { BackupService } from './services/backup.service.js';

export function createApp(storagePath: string): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const storageService = new StorageService(storagePath);
  const backupService = new BackupService(storageService);

  app.use('/api', createRoutes(storageService, backupService));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);

  (app as Express & { storageService: StorageService; backupService: BackupService }).storageService = storageService;
  (app as Express & { storageService: StorageService; backupService: BackupService }).backupService = backupService;

  return app;
}

/**
 * Start the server (only runs when this file is the entry point)
 */
async function start(): Promise<void> {
  const PORT = process.env.PORT ?? 3456;
  const storagePath = process.env.CRM_STORAGE_PATH ?? process.env.STORAGE_PATH ?? './data';

  const app = createApp(storagePath);
  const appWithServices = app as Express & { storageService: StorageService; backupService: BackupService };

  try {
    await appWithServices.storageService.initialize();
    appWithServices.backupService.start();

    app.listen(PORT, () => {
      console.log(`🚀 CRM Backend running on http://localhost:${PORT}`);
      console.log(`📁 Storage path: ${storagePath}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  void start();
}
