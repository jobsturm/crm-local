/**
 * Backend Server Entry Point for Electron Bundling
 *
 * This file exports a function to start the server, used by Electron's main process.
 */

import express from 'express';
import cors from 'cors';
import { createRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { StorageService } from './services/storage.service.js';
import { BackupService } from './services/backup.service.js';
import type { Server } from 'http';

let server: Server | null = null;
let storageService: StorageService | null = null;
let backupService: BackupService | null = null;

export interface StartServerOptions {
  port?: number;
  storagePath: string;
}

export interface ServerInfo {
  port: number;
  storagePath: string;
}

/**
 * Start the backend server
 */
export async function startServer(options: StartServerOptions): Promise<ServerInfo> {
  const { port = 3456, storagePath } = options;

  if (server) {
    console.log('Server already running');
    return { port, storagePath };
  }

  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  storageService = new StorageService(storagePath);
  backupService = new BackupService(storageService);

  app.use('/api', createRoutes(storageService, backupService));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);

  await storageService.initialize();
  backupService.start();

  // Start server with port retry logic
  const tryListen = (tryPort: number, maxRetries: number): Promise<ServerInfo> => {
    return new Promise((resolve, reject) => {
      server = app.listen(tryPort, () => {
        console.log(`🚀 CRM Backend running on http://localhost:${tryPort}`);
        console.log(`📁 Storage path: ${storagePath}`);
        resolve({ port: tryPort, storagePath });
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && maxRetries > 0) {
          console.log(`Port ${tryPort} is in use, trying ${tryPort + 1}...`);
          server = null;
          tryListen(tryPort + 1, maxRetries - 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  };

  return tryListen(port, 10);
}

/**
 * Stop the backend server
 */
export async function stopServer(): Promise<void> {
  backupService?.stop();
  backupService = null;

  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('🛑 CRM Backend stopped');
        server = null;
        storageService = null;
        resolve();
      });
    } else {
      storageService = null;
      resolve();
    }
  });
}

// Auto-start when run directly (works with both ESM and CJS bundled formats)
const isMainModule = require.main === module || process.argv[1]?.endsWith('server.cjs');

if (isMainModule) {
  const storagePath = process.env.CRM_STORAGE_PATH || './data';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3456;
  startServer({ storagePath, port }).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
