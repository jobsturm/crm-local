/**
 * Electron Main Process
 *
 * Creates the main application window, handles IPC communication, auto-updates,
 * and manages the bundled backend server.
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fork, type ChildProcess } from 'child_process';

// ESM compatibility - get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Disable hardware acceleration for better compatibility
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let backendPort = 3456;

// ============================================================
// Backend Server Management
// ============================================================

function getBackendPath(): string {
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development: use the source directly
    return join(__dirname, '../../packages/backend/dist-bundle/server.cjs');
  }
  // Production: bundled with the app
  return join(process.resourcesPath, 'backend', 'server.cjs');
}

function getStoragePath(): string {
  // Use app's userData directory for storage
  return join(app.getPath('userData'), 'data');
}

async function startBackend(): Promise<number> {
  return new Promise((resolve, reject) => {
    const backendPath = getBackendPath();
    const storagePath = getStoragePath();

    console.log(`Starting backend from: ${backendPath}`);
    console.log(`Storage path: ${storagePath}`);

    // Fork the backend process
    backendProcess = fork(backendPath, [], {
      env: {
        ...process.env,
        CRM_STORAGE_PATH: storagePath,
        PORT: String(backendPort),
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    let started = false;

    backendProcess.stdout?.on('data', (data: Buffer) => {
      const message = data.toString();
      console.log(`[Backend] ${message}`);
      
      // Check if server started successfully
      if (message.includes('CRM Backend running') && !started) {
        started = true;
        // Extract port from message if it changed
        const portMatch = message.match(/localhost:(\d+)/);
        if (portMatch && portMatch[1]) {
          backendPort = parseInt(portMatch[1], 10);
        }
        resolve(backendPort);
      }
    });

    backendProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`[Backend Error] ${data.toString()}`);
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
      if (!started) {
        reject(err);
      }
    });

    backendProcess.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendProcess = null;
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!started) {
        reject(new Error('Backend startup timeout'));
      }
    }, 10000);
  });
}

function stopBackend(): void {
  if (backendProcess) {
    console.log('Stopping backend...');
    backendProcess.kill();
    backendProcess = null;
  }
}

// ============================================================
// Auto-Updater Configuration
// ============================================================

// Configure auto-updater logging
autoUpdater.logger = console;

// Don't auto-download, let user decide
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  // Check for updates (only in production, and only if app-update.yml exists)
  if (!process.env.VITE_DEV_SERVER_URL) {
    // Check for updates after a short delay
    setTimeout(async () => {
      try {
        // Check if app-update.yml exists (it won't for dev/dir builds)
        const fs = await import('fs/promises');
        const updateConfigPath = join(process.resourcesPath, 'app-update.yml');
        await fs.access(updateConfigPath);
        
        // File exists, safe to check for updates
        autoUpdater.checkForUpdates().catch((err) => {
          console.log('Auto-update check failed:', err.message);
        });
      } catch {
        // app-update.yml doesn't exist, skip auto-updates silently
        console.log('Auto-updates disabled (no app-update.yml)');
      }
    }, 3000);
  }

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('updater:checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('updater:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('updater:not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('updater:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('updater:downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    sendToRenderer('updater:error', {
      message: err.message,
    });
  });
}

function sendToRenderer(channel: string, data?: unknown) {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // Show when ready to prevent flash
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development: load from Vite dev server
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    void mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    // Start the backend server first (skip in dev mode with external backend)
    if (!process.env.VITE_DEV_SERVER_URL || process.env.BUNDLE_BACKEND === 'true') {
      console.log('Starting bundled backend...');
      backendPort = await startBackend();
      console.log(`Backend started on port ${backendPort}`);
    }

    createWindow();
    setupAutoUpdater();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to start app:', error);
    dialog.showErrorBox('Startup Error', `Failed to start backend: ${error}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  stopBackend();
});

app.on('quit', () => {
  stopBackend();
});

// ============================================================
// IPC Handlers
// ============================================================

// Save file dialog (for PDF export)
ipcMain.handle(
  'dialog:saveFile',
  async (
    _event,
    options: {
      title: string;
      defaultPath: string;
      filters: Array<{ name: string; extensions: string[] }>;
    }
  ) => {
    const result = await dialog.showSaveDialog({
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters,
    });
    return {
      canceled: result.canceled,
      filePath: result.filePath,
    };
  }
);

// Select directory dialog (for storage path)
ipcMain.handle(
  'dialog:selectDirectory',
  async (
    _event,
    options?: {
      title?: string;
      defaultPath?: string;
    }
  ) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: options?.title ?? 'Select Directory',
      defaultPath: options?.defaultPath,
    });
    return {
      canceled: result.canceled,
      filePath: result.filePaths[0],
    };
  }
);

// Generate PDF using printToPDF
ipcMain.handle(
  'pdf:generate',
  async (_event, html: string, filePath: string): Promise<{ success: boolean; error?: string }> => {
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');
    
    // Create a temporary HTML file - more reliable than data: URLs on Windows
    const tempDir = os.tmpdir();
    const tempHtmlPath = path.join(tempDir, `crm-pdf-${Date.now()}.html`);
    
    try {
      // Write HTML to temporary file
      await fs.writeFile(tempHtmlPath, html, 'utf-8');
      
      // Create a hidden window for PDF generation
      const pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Load the HTML from the temporary file
      await pdfWindow.loadFile(tempHtmlPath);

      // Wait a bit for content to render
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate PDF
      const pdfData = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });

      // Write PDF to file
      await fs.writeFile(filePath, pdfData);

      // Close the PDF window
      pdfWindow.close();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating PDF',
      };
    } finally {
      // Clean up temporary HTML file
      try {
        await fs.unlink(tempHtmlPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
);

// ============================================================
// Auto-Updater IPC Handlers
// ============================================================

// Check for updates manually
ipcMain.handle('updater:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check for updates',
    };
  }
});

// Download the update
ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download update',
    };
  }
});

// Install the update and restart
ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall(false, true);
});

// Get current app version
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

// Get backend port
ipcMain.handle('backend:port', () => {
  return backendPort;
});

// Get storage path
ipcMain.handle('storage:path', () => {
  return getStoragePath();
});
