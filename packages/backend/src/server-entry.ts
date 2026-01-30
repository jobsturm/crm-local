/**
 * Backend Server Entry Point for Electron Bundling
 *
 * This file exports a function to start the server, used by Electron's main process.
 */

import express, { type Express } from 'express';
import cors from 'cors';
import { createRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { StorageService } from './services/storage.service.js';
import type { Server } from 'http';

let server: Server | null = null;
let storageService: StorageService | null = null;

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

  // Initialize storage service
  storageService = new StorageService(storagePath);

  // Routes
  app.use('/api', createRoutes(storageService));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  // Initialize storage
  await storageService.initialize();

  // Start server
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(port, () => {
        console.log(`🚀 CRM Backend running on http://localhost:${port}`);
        console.log(`📁 Storage path: ${storagePath}`);
        resolve({ port, storagePath });
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is in use, trying ${port + 1}...`);
          server = app.listen(port + 1, () => {
            console.log(`🚀 CRM Backend running on http://localhost:${port + 1}`);
            resolve({ port: port + 1, storagePath });
          });
        } else {
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Stop the backend server
 */
export async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('🛑 CRM Backend stopped');
        server = null;
        storageService = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// If running directly (for testing)
if (require.main === module) {
  const storagePath = process.env.CRM_STORAGE_PATH || './data';
  startServer({ storagePath }).catch(console.error);
}
