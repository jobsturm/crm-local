/**
 * Electron Main Process
 *
 * Creates the main application window, handles IPC communication, auto-updates,
 * and manages the bundled backend server.
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
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

// Auto-updater state
let latestAvailableVersion: string | null = null;
let activeDownloadItem: Electron.DownloadItem | null = null;
let savedDmgPath: string | null = null;

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
// Only auto-install on quit for Windows — macOS uses the assisted-download flow
autoUpdater.autoInstallOnAppQuit = process.platform !== 'darwin';

// We ship UNSIGNED builds (no paid Apple/Windows cert). electron-updater's
// default Windows signature check would reject unsigned updates, so we override
// it with a no-op that reports "valid". Trade-off: no defense against a
// compromised GitHub release; mitigations are HTTPS transport + GitHub-only,
// self-published releases. macOS never reaches this path (see assisted-download flow).
// NOTE: assigning `false` is a silent no-op in electron-updater — it MUST be a function.
(autoUpdater as unknown as { verifyUpdateCodeSignature: (publisherName: string[], path: string) => Promise<string | null> }).verifyUpdateCodeSignature = (_publisherName: string[], _path: string) => Promise.resolve(null);

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
    latestAvailableVersion = info.version;
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
    title: `Simpel CRM v${app.getVersion()}`,
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
// macOS Assisted-Download Flow
// ============================================================

async function downloadDmgForMac(version: string): Promise<void> {
  if (!mainWindow) return;

  const dmgUrl = `https://github.com/jobsturm/crm-local/releases/download/v${version}/Simpel-CRM-${version}-mac-universal.dmg`;
  const downloadsDir = app.getPath('downloads');
  const targetPath = join(downloadsDir, `Simpel-CRM-${version}-mac-universal.dmg`);

  // HEAD-check: verify the DMG URL exists before downloading
  try {
    const { net } = await import('electron');
    await new Promise<void>((resolve, reject) => {
      const request = net.request({ method: 'HEAD', url: dmgUrl });
      request.on('response', (response) => {
        if (response.statusCode >= 200 && response.statusCode < 400) {
          resolve();
        } else {
          reject(new Error(`DMG not found: HTTP ${response.statusCode}`));
        }
      });
      request.on('error', reject);
      request.end();
    });
  } catch (err) {
    console.error('DMG HEAD-check failed, opening releases page:', err);
    await shell.openExternal('https://github.com/jobsturm/crm-local/releases/latest');
    sendToRenderer('updater:error', { message: 'Could not reach update file. Opening releases page in browser.' });
    return;
  }

  const handleWillDownload = (_event: Electron.Event, item: Electron.DownloadItem) => {
    if (!item.getURL().includes('mac-universal.dmg')) return;

    item.setSavePath(targetPath);
    activeDownloadItem = item;

    item.on('updated', (_e, state) => {
      if (state === 'progressing') {
        const received = item.getReceivedBytes();
        const total = item.getTotalBytes();
        const percent = total > 0 ? (received / total) * 100 : 0;
        sendToRenderer('updater:progress', {
          percent,
          bytesPerSecond: 0,
          transferred: received,
          total,
        });
      }
    });

    item.on('done', async (_e, state) => {
      activeDownloadItem = null;
      mainWindow?.webContents.session.removeListener('will-download', handleWillDownload);

      if (state === 'completed') {
        savedDmgPath = item.getSavePath();
        sendToRenderer('updater:downloaded', { version, filePath: savedDmgPath });
      } else if (state === 'cancelled') {
        try {
          const fs = await import('fs/promises');
          await fs.unlink(targetPath);
        } catch {
          // File may not exist
        }
        sendToRenderer('updater:error', { message: 'Download cancelled.' });
      } else {
        sendToRenderer('updater:error', { message: 'Download was interrupted. Please try again.' });
      }
    });
  };

  mainWindow.webContents.session.on('will-download', handleWillDownload);
  mainWindow.webContents.downloadURL(dmgUrl);
}

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

// Save text file (for UBL XML export)
ipcMain.handle(
  'file:saveText',
  async (_event, content: string, filePath: string): Promise<{ success: boolean; error?: string }> => {
    const fs = await import('fs/promises');
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving file',
      };
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

// Download the update (platform-branched)
ipcMain.handle('updater:download', async () => {
  try {
    if (process.platform === 'darwin') {
      // macOS: manually download DMG to ~/Downloads (Squirrel.Mac cannot install unsigned builds)
      if (!latestAvailableVersion) {
        return { success: false, error: 'No update version available. Check for updates first.' };
      }
      void downloadDmgForMac(latestAvailableVersion);
      return { success: true };
    } else {
      await autoUpdater.downloadUpdate();
      return { success: true };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download update',
    };
  }
});

// Install the update and restart (Windows only — macOS uses reveal flow)
ipcMain.handle('updater:install', () => {
  if (process.platform === 'darwin') {
    return;
  }
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('updater:reveal', () => {
  if (savedDmgPath) {
    shell.showItemInFolder(savedDmgPath);
  }
});

ipcMain.handle('updater:cancel-download', async () => {
  if (activeDownloadItem) {
    activeDownloadItem.cancel();
    activeDownloadItem = null;
  }
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
