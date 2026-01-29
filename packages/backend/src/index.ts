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

/**
 * Create the Express app with a given storage path.
 * Used for both production and testing.
 */
export function createApp(storagePath: string): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Initialize storage service
  const storageService = new StorageService(storagePath);

  // Routes
  app.use('/api', createRoutes(storageService));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  // Attach storage service for initialization
  (app as Express & { storageService: StorageService }).storageService = storageService;

  return app;
}

/**
 * Start the server (only runs when this file is the entry point)
 */
async function start(): Promise<void> {
  const PORT = process.env.PORT ?? 3456;
  const storagePath = process.env.CRM_STORAGE_PATH ?? process.env.STORAGE_PATH ?? './data';

  const app = createApp(storagePath);
  const storageService = (app as Express & { storageService: StorageService }).storageService;

  try {
    // Initialize storage (create directories, load/create database)
    await storageService.initialize();

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
